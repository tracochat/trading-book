import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Database, Bell, Shield } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your trading book management preferences.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="size-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic application preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Base Currency</p>
                    <p className="text-sm text-muted-foreground">
                      Default currency for portfolio valuations and reports.
                    </p>
                  </div>
                  <div className="font-mono text-sm bg-muted px-3 py-1 rounded">USD</div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Fiscal Year Start</p>
                    <p className="text-sm text-muted-foreground">
                      Start month for fiscal year calculations.
                    </p>
                  </div>
                  <div className="font-mono text-sm bg-muted px-3 py-1 rounded">January</div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Cost Basis Method</p>
                    <p className="text-sm text-muted-foreground">
                      Method for calculating gains/losses on sales.
                    </p>
                  </div>
                  <div className="font-mono text-sm bg-muted px-3 py-1 rounded">FIFO</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Import/export settings and data maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Auto-create Instruments</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create instrument records when importing trades.
                    </p>
                  </div>
                  <div className="font-mono text-sm bg-success/20 text-success px-3 py-1 rounded">Enabled</div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Duplicate Detection</p>
                    <p className="text-sm text-muted-foreground">
                      Check for duplicate trades during import reconciliation.
                    </p>
                  </div>
                  <div className="font-mono text-sm bg-success/20 text-success px-3 py-1 rounded">Enabled</div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">IBKR Report Format</p>
                    <p className="text-sm text-muted-foreground">
                      Expected format for Interactive Brokers activity reports.
                    </p>
                  </div>
                  <div className="font-mono text-sm bg-muted px-3 py-1 rounded">HTML</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure alerts and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Bell className="size-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Coming Soon</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Notification settings will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage access and authentication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Shield className="size-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Coming Soon</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Security settings will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
