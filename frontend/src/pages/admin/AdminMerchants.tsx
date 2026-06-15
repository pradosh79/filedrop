import React, { useState, useEffect } from 'react';
import {
  Page, Card, DataTable, Badge, Button, Text,
  Toast, Frame, Box, TextField, InlineStack,
  Modal, BlockStack, Spinner,
} from '@shopify/polaris';

import { getApiUrl } from '../../utils/config';
const API_URL = getApiUrl();

function formatBytes(b: number) {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
  return `${(b / 1024).toFixed(1)} KB`;
}

export function AdminMerchants() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [search, setSearch] = useState('');
  const adminKey = localStorage.getItem('admin_key') || '';

  const loadMerchants = () => {
    setLoading(true);
    fetch(`${API_URL}/admin/merchants`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(d => { setMerchants(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadMerchants(); }, []);

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await fetch(`${API_URL}/admin/merchants/${deleteModal.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      setToast(`${deleteModal.shopDomain} deleted`);
      setDeleteModal(null);
      loadMerchants();
    } catch {
      setToast('Delete failed');
    }
  };

  const filtered = merchants.filter(m =>
    m.shopDomain?.toLowerCase().includes(search.toLowerCase()) ||
    m.shopName?.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(m => [
    <BlockStack gap="050">
      <Text variant="bodyMd" fontWeight="semibold">{m.shopDomain}</Text>
      <Text variant="bodySm" tone="subdued">{m.shopName || '—'}</Text>
    </BlockStack>,
    m.isActive
      ? <Badge tone="success">Active</Badge>
      : <Badge tone="critical">Inactive</Badge>,
    m.subscription?.status
      ? <Badge tone={m.subscription.status === 'active' ? 'success' : 'warning'}>
          {m.subscription.status}
        </Badge>
      : <Badge>No sub</Badge>,
    m.totalUploads || 0,
    formatBytes(m.storageUsedBytes || 0),
    new Date(m.createdAt).toLocaleDateString(),
    <Button
      tone="critical"
      variant="plain"
      onClick={() => setDeleteModal(m)}
    >
      Delete
    </Button>,
  ]);

  return (
    <Frame>
      <Page
        title="Merchants"
        subtitle={`${merchants.length} total merchants`}
      >
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}

        <Box paddingBlockEnd="400">
          <TextField
            label=""
            labelHidden
            placeholder="Search by shop domain or name..."
            value={search}
            onChange={setSearch}
            autoComplete="off"
            clearButton
            onClearButtonClick={() => setSearch('')}
          />
        </Box>

        <Card>
          {loading ? (
            <Box padding="800"><InlineStack align="center"><Spinner /></InlineStack></Box>
          ) : (
            <DataTable
              columnContentTypes={['text','text','text','numeric','text','text','text']}
              headings={['Shop', 'Status', 'Subscription', 'Uploads', 'Storage', 'Joined', 'Actions']}
              rows={rows}
              footerContent={`${filtered.length} merchants`}
            />
          )}
        </Card>

        <Modal
          open={!!deleteModal}
          onClose={() => setDeleteModal(null)}
          title="Delete merchant"
          primaryAction={{ content: 'Delete', destructive: true, onAction: handleDelete }}
          secondaryActions={[{ content: 'Cancel', onAction: () => setDeleteModal(null) }]}
        >
          <Modal.Section>
            <Text as="p">
              Are you sure you want to delete <strong>{deleteModal?.shopDomain}</strong>?
              This will permanently delete all their data including uploads, fields, and settings.
            </Text>
          </Modal.Section>
        </Modal>
      </Page>
    </Frame>
  );
}
