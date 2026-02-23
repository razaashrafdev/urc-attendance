import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, FileText, LogOut, Menu, X, Clock, Server } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/employees', label: 'Employees', icon: Users },
  { path: '/attendance', label: 'Attendance', icon: Clock },
  { path: '/holidays', label: 'Holidays', icon: CalendarDays },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/devices', label: 'Devices', icon: Server },
];

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar - icon only, expands on hover */}
      <aside
        className="hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 w-[68px] hover:w-64 transition-all duration-300 ease-in-out overflow-hidden group/sidebar"
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border flex items-center gap-3 h-16 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
            URC Attendance
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent px-3 whitespace-nowrap"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="ml-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              Sign Out
            </span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-base font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
            URC Attendance
          </h1>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="px-4 py-3 bg-card border-b border-border space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <Button variant="ghost" className="w-full justify-start mt-2" onClick={signOut}>
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </nav>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-18 lg:pt-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
