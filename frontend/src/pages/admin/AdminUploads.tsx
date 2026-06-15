import React, { useState, useEffect } from 'react';
import {
  Page, Card, DataTable, Badge, Text, Box,
  InlineStack, Spinner, TextField, BlockStack,
} from '@shopify/polaris';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api/v1';

function formatBytes(b: number) {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
  return `${(b / 1024).toFixed(1)} KB`;
}

const STATUS_TONE: Record<string, any> = {
  clean: 'success', infected: 'critical',
  pending: 'attention', scanning: 'info', failed: 'warning',
};

export function AdminUploads() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const adminKey = localStorage.getItem('admin_key') || '';

  useEffect(() => {
    fetch(`${API_URL}/admin/uploads`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(d => { setUploads(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = uploads.filter(u =>
    !search ||
    u.originalFileName?.toLowerCase().includes(search.toLowerCase()) ||
    u.merchantId?.toLowerCase().includes(search.toLowerCase()) ||
    u.customerEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filtered.map(u => [
    <BlockStack gap="050">
      <Text variant="bodySm" fontWeight="semibold">{u.originalFileName}</Text>
      <Text variant="bodySm" tone="subdued">{u.customerEmail || '—'}</Text>
    </BlockStack>,
    u.merchantId?.slice(0, 8) + '...',
    formatBytes(u.fileSizeBytes || 0),
    u.mimeType || '—',
    <Badge tone={STATUS_TONE[u.status] || 'attention'}>{u.status}</Badge>,
    new Date(u.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page title="All Uploads" subtitle={`${uploads.length} total across all merchants`}>
      <Box paddingBlockEnd="400">
        <TextField
          label="" labelHidden
          placeholder="Search by file name, merchant ID or customer email..."
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
            columnContentTypes={['text','text','text','text','text','text']}
            headings={['File', 'Merchant', 'Size', 'Type', 'Status', 'Date']}
            rows={rows}
            footerContent={`Showing ${filtered.length} of ${uploads.length} uploads`}
          />
        )}
      </Card>
    </Page>
  );
}
