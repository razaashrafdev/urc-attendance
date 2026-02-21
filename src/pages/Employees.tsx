import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, Users, UserCheck, UserX } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  device_user_id: string;
  employee_code: string | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  department: string | null;
  designation: string | null;
  phone: string | null;
  is_active: boolean;
}

const defaultEmployee: Omit<Employee, 'id'> = {
  device_user_id: '', employee_code: '', first_name: '', last_name: '', email: '', department: '', designation: '', phone: '', is_active: true,
};

const avatarColors = [
  'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600',
  'bg-pink-600', 'bg-cyan-600', 'bg-red-600', 'bg-indigo-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(first: string, last?: string | null) {
  return `${first.charAt(0)}${last ? last.charAt(0) : ''}`.toUpperCase();
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(defaultEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('employees').select('*').order('first_name');
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else setEmployees(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingEmployee) {
        const { error } = await supabase.from('employees').update(formData).eq('id', editingEmployee.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Employee updated' });
      } else {
        const { error } = await supabase.from('employees').insert(formData);
        if (error) throw error;
        toast({ title: 'Success', description: 'Employee added' });
      }
      setDialogOpen(false); setEditingEmployee(null); setFormData(defaultEmployee); fetchEmployees();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally { setIsSubmitting(false); }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({ device_user_id: employee.device_user_id, employee_code: employee.employee_code, first_name: employee.first_name, last_name: employee.last_name, email: employee.email, department: employee.department, designation: employee.designation, phone: employee.phone, is_active: employee.is_active });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
    else { toast({ title: 'Deleted' }); fetchEmployees(); }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.device_user_id.includes(searchQuery) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage employee records and device mappings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingEmployee(null); setFormData(defaultEmployee); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Device User ID *</Label><Input value={formData.device_user_id} onChange={(e) => setFormData({ ...formData, device_user_id: e.target.value })} placeholder="e.g., 1001" required /></div>
                <div className="space-y-2"><Label>Employee Code</Label><Input value={formData.employee_code || ''} onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })} placeholder="e.g., EMP-001" /></div>
                <div className="space-y-2"><Label>First Name *</Label><Input value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Department</Label><Input value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} /></div>
                <div className="space-y-2"><Label>Designation</Label><Input value={formData.designation || ''} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingEmployee ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Users, label: 'Total', value: employees.length, color: 'text-primary' },
          { icon: UserCheck, label: 'Active', value: activeCount, color: 'text-emerald-600' },
          { icon: UserX, label: 'Inactive', value: inactiveCount, color: 'text-red-600' },
        ].map((stat, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Employee List */}
      <Card>
        <div className="px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">{filteredEmployees.length} Employees</span>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Desktop table header */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-2 px-4 py-3 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Employee</span>
                <span>Department</span>
                <span>Device ID</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No employees found</div>
              ) : (
                filteredEmployees.map(emp => {
                  const name = `${emp.first_name} ${emp.last_name || ''}`.trim();
                  return (
                    <div key={emp.id} className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_100px] gap-2 md:items-center px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', getAvatarColor(name))}>
                          {getInitials(emp.first_name, emp.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{name}</p>
                          <p className="text-xs text-muted-foreground">{emp.designation || emp.email || ''}</p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground md:text-foreground">{emp.department || '—'}</span>
                      <span className="text-sm font-mono">{emp.device_user_id}</span>
                      <span>
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
                          emp.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        )}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(emp)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {name}? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(emp.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
