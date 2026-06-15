import React, { useState, useEffect } from 'react';
import {
  Page, Layout, Card, FormLayout, TextField,
  Button, Toast, Frame, Text, BlockStack, Box,
  InlineStack, Checkbox, Banner,
} from '@shopify/polaris';

import { getApiUrl } from '../../utils/config';
const API_URL = getApiUrl();

export function AdminSettings() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const adminKey = localStorage.getItem('admin_key') || '';

  useEffect(() => {
    fetch(`${API_URL}/admin/settings`, {
      headers: { 'x-admin-key': adminKey },
    })
      .then(r => r.json())
      .then(d => { setSettings(d.data || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(settings),
      });
      setToast('Settings saved successfully');
    } catch {
      setToast('Failed to save settings');
    }
    setSaving(false);
  };

  return (
    <Frame>
      <Page title="App Settings" subtitle="Global configuration for the platform">
        {toast && <Toast content={toast} onDismiss={() => setToast(null)} />}

        {settings.maintenanceMode && (
          <Box paddingBlockEnd="400">
            <Banner tone="warning" title="Maintenance mode is ON">
              New installs and uploads are blocked for all merchants.
            </Banner>
          </Box>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">General</Text>
                  <FormLayout>
                    <TextField
                      label="App name"
                      value={settings.appName || ''}
                      onChange={v => setSettings({ ...settings, appName: v })}
                      autoComplete="off"
                    />
                    <TextField
                      label="Support email"
                      type="email"
                      value={settings.supportEmail || ''}
                      onChange={v => setSettings({ ...settings, supportEmail: v })}
                      autoComplete="off"
                    />
                    <TextField
                      label="Default trial days"
                      type="number"
                      value={String(settings.defaultTrialDays || 14)}
                      onChange={v => setSettings({ ...settings, defaultTrialDays: parseInt(v) })}
                      helpText="How many days new merchants get for free trial"
                      autoComplete="off"
                    />
                  </FormLayout>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Box padding="500">
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">Access control</Text>
                  <Checkbox
                    label="Maintenance mode"
                    helpText="When enabled, all uploads are blocked and merchants see a maintenance message"
                    checked={settings.maintenanceMode || false}
                    onChange={v => setSettings({ ...settings, maintenanceMode: v })}
                  />
                  <Checkbox
                    label="Allow new registrations"
                    helpText="When disabled, no new stores can install the app"
                    checked={settings.allowNewRegistrations !== false}
                    onChange={v => setSettings({ ...settings, allowNewRegistrations: v })}
                  />
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <InlineStack align="end">
              <Button variant="primary" loading={saving} onClick={handleSave}>
                Save settings
              </Button>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
