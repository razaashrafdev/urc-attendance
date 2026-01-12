import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit2, 
  Server,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Device {
  id: string;
  device_name: string;
  device_ip: string;
  device_port: number;
  location: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface SyncLog {
  id: string;
  device_id: string;
  status: string;
  records_fetched: number;
  records_added: number;
  sync_start_at: string;
  sync_end_at: string | null;
  error_message: string | null;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    device_name: '',
    device_ip: '',
    device_port: 4370,
    location: '',
  });

  useEffect(() => {
    fetchDevices();
    fetchSyncLogs();
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('sync_start_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

  const handleSaveDevice = async () => {
    try {
      if (editingDevice) {
        const { error } = await supabase
          .from('devices')
          .update({
            device_name: formData.device_name,
            device_ip: formData.device_ip,
            device_port: formData.device_port,
            location: formData.location || null,
          })
          .eq('id', editingDevice.id);

        if (error) throw error;
        toast.success('Device updated successfully');
      } else {
        const { error } = await supabase
          .from('devices')
          .insert({
            device_name: formData.device_name,
            device_ip: formData.device_ip,
            device_port: formData.device_port,
            location: formData.location || null,
          });

        if (error) throw error;
        toast.success('Device added successfully');
      }

      setDialogOpen(false);
      setEditingDevice(null);
      setFormData({ device_name: '', device_ip: '', device_port: 4370, location: '' });
      fetchDevices();
    } catch (error: any) {
      console.error('Error saving device:', error);
      toast.error(error.message || 'Failed to save device');
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Device deleted successfully');
      fetchDevices();
    } catch (error: any) {
      console.error('Error deleting device:', error);
      toast.error(error.message || 'Failed to delete device');
    }
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      device_name: device.device_name,
      device_ip: device.device_ip,
      device_port: device.device_port,
      location: device.location || '',
    });
    setDialogOpen(true);
  };

  const toggleDeviceStatus = async (device: Device) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ is_active: !device.is_active })
        .eq('id', device.id);

      if (error) throw error;
      toast.success(`Device ${device.is_active ? 'disabled' : 'enabled'}`);
      fetchDevices();
    } catch (error: any) {
      console.error('Error toggling device:', error);
      toast.error(error.message || 'Failed to update device');
    }
  };

  const getConnectionStatus = (device: Device) => {
    if (!device.is_active) {
      return { status: 'disabled', color: 'secondary', icon: WifiOff };
    }
    if (!device.last_sync_at) {
      return { status: 'never synced', color: 'destructive', icon: AlertCircle };
    }
    
    const lastSync = new Date(device.last_sync_at);
    const minutesAgo = (Date.now() - lastSync.getTime()) / (1000 * 60);
    
    if (minutesAgo < 30) {
      return { status: 'connected', color: 'default', icon: CheckCircle };
    } else if (minutesAgo < 60) {
      return { status: 'idle', color: 'secondary', icon: Clock };
    } else {
      return { status: 'offline', color: 'destructive', icon: XCircle };
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'completed_with_errors':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Partial</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-description">Manage ZKTeco attendance devices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingDevice(null);
            setFormData({ device_name: '', device_ip: '', device_port: 4370, location: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
              <DialogDescription>
                Enter the device configuration details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="device_name">Device Name</Label>
                <Input
                  id="device_name"
                  placeholder="Main Entrance"
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device_ip">IP Address</Label>
                  <Input
                    id="device_ip"
                    placeholder="192.168.1.201"
                    value={formData.device_ip}
                    onChange={(e) => setFormData({ ...formData, device_ip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device_port">Port</Label>
                  <Input
                    id="device_port"
                    type="number"
                    placeholder="4370"
                    value={formData.device_port}
                    onChange={(e) => setFormData({ ...formData, device_port: parseInt(e.target.value) || 4370 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  placeholder="Building A, Floor 1"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDevice}>
                {editingDevice ? 'Update' : 'Add'} Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {devices.map((device) => {
          const connectionStatus = getConnectionStatus(device);
          const StatusIcon = connectionStatus.icon;
          
          return (
            <Card key={device.id} className={!device.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Server className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{device.device_name}</CardTitle>
                      <CardDescription>{device.location || 'No location set'}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={connectionStatus.color as any} className="flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {connectionStatus.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">IP Address</span>
                    <span className="font-mono">{device.device_ip}:{device.device_port}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span>
                      {device.last_sync_at 
                        ? formatDistanceToNow(new Date(device.last_sync_at), { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditDevice(device)}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleDeviceStatus(device)}
                    >
                      {device.is_active ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteDevice(device.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {devices.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No devices configured</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first ZKTeco device to start syncing attendance data
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sync Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Sync Logs</CardTitle>
            <CardDescription>History of device synchronization activities</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => { fetchDevices(); fetchSyncLogs(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sync logs yet. Run the local sync service to start syncing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records Fetched</TableHead>
                  <TableHead>Records Added</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.sync_start_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{getSyncStatusBadge(log.status)}</TableCell>
                    <TableCell>{log.records_fetched || 0}</TableCell>
                    <TableCell>{log.records_added || 0}</TableCell>
                    <TableCell>
                      {log.sync_end_at 
                        ? `${((new Date(log.sync_end_at).getTime() - new Date(log.sync_start_at).getTime()) / 1000).toFixed(1)}s`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Local Sync Service Required
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p className="text-muted-foreground">
            To sync attendance data from ZKTeco devices, you need to run the local sync service on a computer 
            connected to the same network as your devices. The sync service connects to devices via TCP/IP 
            and pushes data to this dashboard.
          </p>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm mt-4">
            <p className="text-muted-foreground mb-2"># Install and run the sync service</p>
            <p>cd local-sync-service</p>
            <p>pip install -r requirements.txt</p>
            <p>python sync_attendance.py --daemon</p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
