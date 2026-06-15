import React, { useState, useEffect } from 'react';
import {
  Page, Layout, Card, Text, BlockStack, InlineStack,
  TextField, Button, Toast, Frame, Badge, Box,
  FormLayout, Divider, Banner,
} from '@shopify/polaris';

import { getApiUrl } from '../../utils/config';
const API_URL = getApiUrl();

function bytesToGB(bytes: number) { return (bytes / 1_073_741_824).toFixed(0); }
function bytesToMB(bytes: number) { return (bytes / 1_048_576).toFixed(0); }
function gbToBytes(gb: string) { return Math.round(parseFloat(gb) * 1_073_741_824); }
function mbToBytes(mb: string) { return Math.round(parseFloat(mb) * 1_048_576); }

export function AdminPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const adminKey = localStorage.getItem('admin_key') || '';

  useEffect(() => {
    fetch(`${API_URL}/admin/plans`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(d => {
        if (!d.data) { setError(`API returned: ${JSON.stringify(d)}`); setLoading(false); return; }
        setPlans(d.data || []);
        // Initialize edit state for each plan
        const initialEdits: Record<string, any> = {};
        (d.data || []).forEach((p: any) => {
          initialEdits[p.id] = {
            displayName: p.displayName,
            monthlyPrice: String(p.monthlyPrice),
            uploadsPerMonth: String(p.uploadsPerMonth),
            storageGB: bytesToGB(p.storageBytes),
            maxFileSizeMB: bytesToMB(p.maxFileSizeBytes),
            isActive: p.isActive,
          };
        });
        setEdits(initialEdits);
        setLoading(false);
      })
      .catch(err => { setError(`Request failed: ${err.message}. API URL: ${API_URL}`); setLoading(false); });
  }, [adminKey]);

  const handleChange = (planId: string, field: string, value: string | boolean) => {
    setEdits(prev => ({
      ...prev,
      [planId]: { ...prev[planId], [field]: value },
    }));
  };

  const handleSave = async (planId: string) => {
    setSaving(planId);
    const edit = edits[planId];
    try {
      const res = await fetch(`${API_URL}/admin/plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          displayName: edit.displayName,
          monthlyPrice: parseFloat(edit.monthlyPrice),
          uploadsPerMonth: parseInt(edit.uploadsPerMonth),
          storageBytes: gbToBytes(edit.storageGB),
          maxFileSizeBytes: mbToBytes(edit.maxFileSizeMB),
          isActive: edit.isActive,
        }),
      });
      if (res.ok) {
        setToast(`${edit.displayName} plan updated successfully`);
        // Refresh plans
        const updated = await fetch(`${API_URL}/admin/plans`, {
          headers: { 'x-admin-key': adminKey },
        }).then(r => r.json());
        setPlans(updated.data || []);
      } else {
        setToast('Failed to update plan');
      }
    } catch {
      setToast('Error saving plan');
    }
    setSaving(null);
  };

  const planColors: Record<string, string> = {
    free: '#f4f6f8',
    starter: '#e3f1df',
    pro: '#e8f0fe',
  };

  return (
    <Frame>
      <Page
        title="Plan Management"
        subtitle="Edit pricing, limits and features for each plan"
      >
        {toast && (
          <Toast content={toast} onDismiss={() => setToast(null)} />
        )}

        <Banner tone="warning">
          <Text as="p">
            Changing prices here updates the database. Existing Shopify subscriptions are NOT automatically updated — merchants will see new prices on their next billing cycle or when they resubscribe.
          </Text>
        </Banner>

        <Box paddingBlockStart="400">
          <Layout>
            {plans.map(plan => (
              <Layout.Section key={plan.id}>
                <Card>
                  <Box padding="500" background={planColors[plan.name] as any}>
                    <InlineStack align="space-between" blockAlignment="center">
                      <InlineStack gap="300" blockAlignment="center">
                        <Text variant="headingLg" as="h2">
                          {plan.displayName} Plan
                        </Text>
                        <Badge tone={plan.isActive ? 'success' : 'critical'}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge>{plan.name}</Badge>
                      </InlineStack>
                    </InlineStack>
                  </Box>

                  <Box padding="500">
                    <FormLayout>
                      <FormLayout.Group>
                        <TextField
                          label="Display name"
                          value={edits[plan.id]?.displayName || ''}
                          onChange={v => handleChange(plan.id, 'displayName', v)}
                          autoComplete="off"
                        />
                        <TextField
                          label="Monthly price (USD)"
                          type="number"
                          prefix="$"
                          value={edits[plan.id]?.monthlyPrice || '0'}
                          onChange={v => handleChange(plan.id, 'monthlyPrice', v)}
                          helpText="Set to 0 for free plans"
                          autoComplete="off"
                        />
                      </FormLayout.Group>

                      <Divider />

                      <FormLayout.Group>
                        <TextField
                          label="Uploads per month"
                          type="number"
                          value={edits[plan.id]?.uploadsPerMonth || '100'}
                          onChange={v => handleChange(plan.id, 'uploadsPerMonth', v)}
                          helpText="Use -1 for unlimited"
                          autoComplete="off"
                        />
                        <TextField
                          label="Storage limit (GB)"
                          type="number"
                          suffix="GB"
                          value={edits[plan.id]?.storageGB || '1'}
                          onChange={v => handleChange(plan.id, 'storageGB', v)}
                          autoComplete="off"
                        />
                        <TextField
                          label="Max file size (MB)"
                          type="number"
                          suffix="MB"
                          value={edits[plan.id]?.maxFileSizeMB || '10'}
                          onChange={v => handleChange(plan.id, 'maxFileSizeMB', v)}
                          autoComplete="off"
                        />
                      </FormLayout.Group>

                      <InlineStack align="end">
                        <Button
                          variant="primary"
                          loading={saving === plan.id}
                          onClick={() => handleSave(plan.id)}
                        >
                          Save {edits[plan.id]?.displayName} plan
                        </Button>
                      </InlineStack>
                    </FormLayout>
                  </Box>
                </Card>
              </Layout.Section>
            ))}
          </Layout>
        </Box>
      </Page>
    </Frame>
  );
}
