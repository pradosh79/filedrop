import React, { useState, useEffect } from 'react';
import {
  Page, Layout, Card, Text, BlockStack, InlineStack,
  Badge, DataTable, Spinner, Box, Banner,
} from '@shopify/polaris';

import { getApiUrl } from '../../utils/config';
const API_URL = getApiUrl();

function formatBytes(b: number) {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(2)} MB`;
  return `${(b / 1024).toFixed(2)} KB`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <Box padding="400">
        <BlockStack gap="100">
          <Text variant="bodySm" tone="subdued">{label}</Text>
          <Text variant="heading2xl" as="p">{value}</Text>
          {sub && <Text variant="bodySm" tone="subdued">{sub}</Text>}
        </BlockStack>
      </Box>
    </Card>
  );
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const adminKey = localStorage.getItem('admin_key') || '';

  useEffect(() => {
    fetch(`${API_URL}/admin/metrics`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(d => { setMetrics(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [adminKey]);

  if (loading) return <Page title="Admin Dashboard"><Spinner /></Page>;

  const rows = (metrics?.recentMerchants || []).map((m: any) => [
    m.shopDomain,
    m.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="critical">Inactive</Badge>,
    m.totalUploads || 0,
    formatBytes(m.storageUsedBytes || 0),
    new Date(m.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page title="Admin Dashboard" subtitle="Platform overview">
      <Layout>
        <Layout.Section>
          <InlineStack gap="400" wrap>
            <StatCard label="Total Merchants" value={String(metrics?.totalMerchants || 0)} />
            <StatCard label="Active Merchants" value={String(metrics?.activeMerchants || 0)} />
            <StatCard label="Total Uploads" value={String(metrics?.totalUploads || 0)} />
            <StatCard label="Total Storage" value={formatBytes(metrics?.totalStorageBytes || 0)} />
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <Text variant="headingMd" as="h2">Recent merchants</Text>
            </Box>
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'text', 'text']}
              headings={['Shop', 'Status', 'Uploads', 'Storage', 'Joined']}
              rows={rows}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
