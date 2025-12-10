import React, { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, Trash2, Save, X, Clock, BookOpen, Loader2 } from 'lucide-react';
import { api, UnitWithOverrideInfo, UnitWeeklyOverride } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function UnitOverrides() {
  const { toast } = useToast();
  const [units, setUnits] = useState<UnitWithOverrideInfo[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<UnitWithOverrideInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUnit, setEditingUnit] = useState<UnitWithOverrideInfo | null>(null);
  const [overrideForm, setOverrideForm] = useState<{ customHours: number; notes: string }>({
    customHours: 3,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUnits();
  }, []);

  useEffect(() => {
    // Filter units based on search term
    if (searchTerm.trim() === '') {
      setFilteredUnits(units);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredUnits(
        units.filter(
          (u) =>
            u.code.toLowerCase().includes(term) ||
            u.name.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, units]);

  const loadUnits = async () => {
    setLoading(true);
    try {
      const data = await api.getUnitsWithOverrides();
      setUnits(data);
      setFilteredUnits(data);
    } catch (error: any) {
      console.error('Failed to load units:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load units",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openOverrideDialog = (unit: UnitWithOverrideInfo) => {
    setEditingUnit(unit);
    setOverrideForm({
      customHours: unit.override_weekly_hours || unit.global_weekly_hours,
      notes: unit.override_notes || ''
    });
  };

  const closeOverrideDialog = () => {
    setEditingUnit(null);
    setOverrideForm({ customHours: 3, notes: '' });
  };

  const handleSaveOverride = async () => {
    if (!editingUnit) return;

    setSaving(true);
    try {
      await api.createOrUpdateUnitOverride({
        unit_code: editingUnit.code,
        custom_weekly_hours: overrideForm.customHours,
        notes: overrideForm.notes
      });

      toast({
        title: "Success",
        description: `Override saved for ${editingUnit.code}`,
      });

      closeOverrideDialog();
      await loadUnits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save override",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (unitCode: string) => {
    if (!confirm(`Remove custom weekly hours for ${unitCode}? It will revert to the global calculation.`)) {
      return;
    }

    try {
      await api.deleteUnitOverride(unitCode);

      toast({
        title: "Success",
        description: `Override removed for ${unitCode}`,
      });

      await loadUnits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete override",
        variant: "destructive"
      });
    }
  };

  const statsOverrides = units.filter(u => u.has_override).length;
  const statsGlobal = units.length - statsOverrides;

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unit Weekly Hour Overrides</h1>
          <p className="text-muted-foreground mt-2">
            Set custom weekly teaching hours for specific units that differ from the global calculation.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Units</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{units.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custom Overrides</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsOverrides}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Using Global</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsGlobal}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search Units</CardTitle>
            <CardDescription>Find units by code or name to manage their weekly hour overrides</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by unit code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Units Table */}
        <Card>
          <CardHeader>
            <CardTitle>Units ({filteredUnits.length})</CardTitle>
            <CardDescription>
              Global weekly hours are calculated from Settings (Total Hours ÷ Semester Weeks).
              Units with custom overrides are highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No units found.</p>
                {searchTerm && <p className="text-sm">Try adjusting your search.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUnits.map((unit) => (
                  <div
                    key={unit.code}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      unit.has_override ? 'bg-orange-50 border-orange-300' : 'bg-white'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{unit.code}</h3>
                        {unit.has_override && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                            Custom Override
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{unit.name}</p>
                      {unit.override_notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Note: {unit.override_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Global</div>
                        <div className="font-medium">{unit.global_weekly_hours} hrs/week</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Effective</div>
                        <div className={`font-bold ${unit.has_override ? 'text-orange-600' : ''}`}>
                          {unit.effective_weekly_hours} hrs/week
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openOverrideDialog(unit)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {unit.has_override ? 'Edit' : 'Override'}
                        </Button>
                        {unit.has_override && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOverride(unit.code)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Override Dialog */}
      <Dialog open={editingUnit !== null} onOpenChange={(open) => !open && closeOverrideDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Custom Weekly Hours</DialogTitle>
            <DialogDescription>
              Override the weekly teaching hours for <strong>{editingUnit?.code}</strong> ({editingUnit?.name})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-hours">Custom Weekly Hours</Label>
              <Input
                id="custom-hours"
                type="number"
                min="1"
                max="20"
                value={overrideForm.customHours}
                onChange={(e) =>
                  setOverrideForm({ ...overrideForm, customHours: parseInt(e.target.value) || 1 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Global calculation: {editingUnit?.global_weekly_hours} hrs/week
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Why does this unit need custom hours?"
                value={overrideForm.notes}
                onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeOverrideDialog} disabled={saving}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSaveOverride} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
