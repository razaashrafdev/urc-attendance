import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  device_user_id: '',
  employee_code: '',
  first_name: '',
  last_name: '',
  email: '',
  department: '',
  designation: '',
  phone: '',
  is_active: true,
};

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(defaultEmployee);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('first_name');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(formData)
          .eq('id', editingEmployee.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Employee updated successfully' });
      } else {
        const { error } = await supabase
          .from('employees')
          .insert(formData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Employee added successfully' });
      }

      setDialogOpen(false);
      setEditingEmployee(null);
      setFormData(defaultEmployee);
      fetchEmployees();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      device_user_id: employee.device_user_id,
      employee_code: employee.employee_code,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      department: employee.department,
      designation: employee.designation,
      phone: employee.phone,
      is_active: employee.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Employee deleted successfully' });
      fetchEmployees();
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.device_user_id.includes(searchQuery) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-description">Manage employee records and device mappings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingEmployee(null);
            setFormData(defaultEmployee);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device_user_id">Device User ID *</Label>
                  <Input
                    id="device_user_id"
                    value={formData.device_user_id}
                    onChange={(e) => setFormData({ ...formData, device_user_id: e.target.value })}
                    placeholder="e.g., 1001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_code">Employee Code</Label>
                  <Input
                    id="employee_code"
                    value={formData.employee_code || ''}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    placeholder="e.g., EMP-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingEmployee ? 'Update' : 'Create'} Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header">Device ID</TableHead>
                  <TableHead className="table-header">Name</TableHead>
                  <TableHead className="table-header">Department</TableHead>
                  <TableHead className="table-header">Designation</TableHead>
                  <TableHead className="table-header">Status</TableHead>
                  <TableHead className="table-header text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-mono text-sm">{employee.device_user_id}</TableCell>
                      <TableCell className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>{employee.designation || '-'}</TableCell>
                      <TableCell>
                        <span className={`status-badge ${employee.is_active ? 'status-present' : 'status-absent'}`}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {employee.first_name} {employee.last_name}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(employee.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
