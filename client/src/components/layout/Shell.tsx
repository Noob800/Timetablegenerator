import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  CalendarDays, 
  Upload, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  GraduationCap,
  Users,
  MapPin,
  FileText
} from "lucide-react";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Upload, label: "Generate", href: "/generate" },
    { icon: CalendarDays, label: "Master Schedule", href: "/schedule/master" },
    { icon: Users, label: "Lecturers", href: "/schedule/lecturer" },
    { icon: MapPin, label: "Venues", href: "/schedule/venue" },
    { icon: FileText, label: "Reports", href: "/reports" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col transition-all duration-300">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">AcademicFlow</h1>
              <p className="text-xs text-muted-foreground">Timetable System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                location === item.href || (item.href !== '/' && location.startsWith(item.href))
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </a>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground w-full transition-colors hover:bg-sidebar-accent/50">
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 w-full mt-1 transition-colors">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
          <div className="text-sm text-muted-foreground">
            Academic Year 2025 • Trimester 3 • <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-xs border border-emerald-100">Active Draft</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              JD
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
