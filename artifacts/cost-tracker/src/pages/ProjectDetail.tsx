import { useState } from "react";
import { useParams } from "wouter";
import { 
  useGetTrackedProject,
  useListTimeEntries,
  useListExpenseEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useCreateExpenseEntry,
  useUpdateExpenseEntry,
  useDeleteExpenseEntry,
  getListTimeEntriesQueryKey,
  getListExpenseEntriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Clock, DollarSign, Plus, Trash2, Tag, Calendar as CalendarIcon, AlignLeft, MoreVertical, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: projectData, isLoading: isLoadingProject } = useGetTrackedProject(projectId);
  const { data: timeData, isLoading: isLoadingTime } = useListTimeEntries(projectId);
  const { data: expenseData, isLoading: isLoadingExpense } = useListExpenseEntries(projectId);

  const createTime = useCreateTimeEntry();
  const updateTime = useUpdateTimeEntry();
  const deleteTime = useDeleteTimeEntry();
  const createExpense = useCreateExpenseEntry();
  const updateExpense = useUpdateExpenseEntry();
  const deleteExpense = useDeleteExpenseEntry();

  const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingTimeId, setEditingTimeId] = useState<number | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

  const [timeForm, setTimeForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), hours: "", description: "" });
  const [expenseForm, setExpenseForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), amount: "", category: "software", description: "" });

  const openNewTime = () => {
    setEditingTimeId(null);
    setTimeForm({ date: format(new Date(), 'yyyy-MM-dd'), hours: "", description: "" });
    setIsTimeModalOpen(true);
  };

  const openEditTime = (entry: { id: number; date: string; hours: number; description?: string | null }) => {
    setEditingTimeId(entry.id);
    setTimeForm({ date: entry.date, hours: entry.hours.toString(), description: entry.description || "" });
    setIsTimeModalOpen(true);
  };

  const openNewExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: "", category: "software", description: "" });
    setIsExpenseModalOpen(true);
  };

  const openEditExpense = (entry: { id: number; date: string; amount: number; category: string; description?: string | null }) => {
    setEditingExpenseId(entry.id);
    setExpenseForm({ date: entry.date, amount: entry.amount.toString(), category: entry.category, description: entry.description || "" });
    setIsExpenseModalOpen(true);
  };

  const handleSaveTime = () => {
    if (!timeForm.date || !timeForm.hours) return;
    
    if (editingTimeId) {
      updateTime.mutate({
        projectId,
        id: editingTimeId,
        data: {
          date: timeForm.date,
          hours: parseFloat(timeForm.hours),
          description: timeForm.description || null
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey(projectId) });
          setIsTimeModalOpen(false);
          toast({ title: "Time entry updated" });
        }
      });
    } else {
      createTime.mutate({
        projectId,
        data: {
          date: timeForm.date,
          hours: parseFloat(timeForm.hours),
          description: timeForm.description || null
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey(projectId) });
          setIsTimeModalOpen(false);
          toast({ title: "Time logged successfully" });
        }
      });
    }
  };

  const handleSaveExpense = () => {
    if (!expenseForm.date || !expenseForm.amount || !expenseForm.category) return;
    
    if (editingExpenseId) {
      updateExpense.mutate({
        projectId,
        id: editingExpenseId,
        data: {
          date: expenseForm.date,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          description: expenseForm.description || null
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpenseEntriesQueryKey(projectId) });
          setIsExpenseModalOpen(false);
          toast({ title: "Expense entry updated" });
        }
      });
    } else {
      createExpense.mutate({
        projectId,
        data: {
          date: expenseForm.date,
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          description: expenseForm.description || null
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpenseEntriesQueryKey(projectId) });
          setIsExpenseModalOpen(false);
          toast({ title: "Expense logged successfully" });
        }
      });
    }
  };

  const handleDeleteTime = (entryId: number) => {
    deleteTime.mutate({ projectId, id: entryId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey(projectId) });
        toast({ title: "Entry deleted" });
      }
    });
  };

  const handleDeleteExpense = (entryId: number) => {
    deleteExpense.mutate({ projectId, id: entryId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpenseEntriesQueryKey(projectId) });
        toast({ title: "Entry deleted" });
      }
    });
  };

  if (isLoadingProject) {
    return <div className="space-y-8"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  const project = projectData?.project;
  if (!project) return <div>Project not found</div>;

  const totalHours = timeData?.entries.reduce((sum, e) => sum + e.hours, 0) || 0;
  const totalSpend = expenseData?.entries.reduce((sum, e) => sum + e.amount, 0) || 0;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <div className="text-sm font-medium text-primary mb-2 flex items-center gap-2">
          Project Ledger
        </div>
        <h1 className="text-4xl font-bold tracking-tight font-serif text-foreground">{project.name}</h1>
        {project.description && <p className="text-muted-foreground mt-3 text-lg max-w-2xl leading-relaxed">{project.description}</p>}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <Button variant="outline" size="sm" onClick={openNewTime} className="gap-2">
                <Plus className="w-4 h-4" /> Log Time
              </Button>
            </div>
            <div className="text-sm text-muted-foreground font-medium mb-1">Total Time Invested</div>
            <div className="text-3xl font-serif text-foreground">{totalHours.toFixed(1)} <span className="text-xl text-muted-foreground font-sans">hrs</span></div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <Button variant="outline" size="sm" onClick={openNewExpense} className="gap-2">
                <Plus className="w-4 h-4" /> Log Expense
              </Button>
            </div>
            <div className="text-sm text-muted-foreground font-medium mb-1">Total Capital Invested</div>
            <div className="text-3xl font-serif text-foreground">{formatCurrency(totalSpend)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="time" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid mb-6">
          <TabsTrigger value="time">Time Entries</TabsTrigger>
          <TabsTrigger value="expenses">Expense Entries</TabsTrigger>
        </TabsList>
        
        <TabsContent value="time" className="space-y-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            {isLoadingTime ? (
              <div className="p-8"><Skeleton className="h-8 w-full mb-4" /><Skeleton className="h-8 w-full" /></div>
            ) : timeData?.entries && timeData.entries.length > 0 ? (
              <div className="divide-y divide-border">
                {timeData.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                  <div key={entry.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 text-primary w-12 h-12 rounded flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold uppercase leading-none">{format(new Date(entry.date), 'MMM')}</span>
                        <span className="text-lg font-serif leading-none mt-0.5">{format(new Date(entry.date), 'd')}</span>
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <span className="text-lg">{entry.hours} hrs</span>
                        </div>
                        {entry.description && <div className="text-muted-foreground text-sm mt-1">{entry.description}</div>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditTime(entry)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteTime(entry.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No time logged yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            {isLoadingExpense ? (
              <div className="p-8"><Skeleton className="h-8 w-full mb-4" /><Skeleton className="h-8 w-full" /></div>
            ) : expenseData?.entries && expenseData.entries.length > 0 ? (
              <div className="divide-y divide-border">
                {expenseData.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                  <div key={entry.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                    <div className="flex gap-4 items-start">
                      <div className="bg-secondary/50 text-secondary-foreground w-12 h-12 rounded flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-bold uppercase leading-none">{format(new Date(entry.date), 'MMM')}</span>
                        <span className="text-lg font-serif leading-none mt-0.5">{format(new Date(entry.date), 'd')}</span>
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <span className="text-lg">{formatCurrency(entry.amount)}</span>
                          <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full text-muted-foreground uppercase tracking-wider">{entry.category}</span>
                        </div>
                        {entry.description && <div className="text-muted-foreground text-sm mt-1">{entry.description}</div>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditExpense(entry)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteExpense(entry.id)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <DollarSign className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No expenses logged yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Time Modal */}
      <Dialog open={isTimeModalOpen} onOpenChange={setIsTimeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingTimeId ? "Edit Time" : "Log Time"}</DialogTitle>
            <DialogDescription>Record time spent on this project.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-date" className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> Date</Label>
                <Input id="t-date" type="date" value={timeForm.date} onChange={e => setTimeForm({...timeForm, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-hours" className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Hours</Label>
                <Input id="t-hours" type="number" min="0.1" step="0.1" value={timeForm.hours} onChange={e => setTimeForm({...timeForm, hours: e.target.value})} placeholder="2.5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-desc" className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5"/> Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="t-desc" value={timeForm.description} onChange={e => setTimeForm({...timeForm, description: e.target.value})} placeholder="What did you work on?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTime} disabled={!timeForm.date || !timeForm.hours || createTime.isPending || updateTime.isPending}>
              {createTime.isPending || updateTime.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingExpenseId ? "Edit Expense" : "Log Expense"}</DialogTitle>
            <DialogDescription>Record a cost incurred for this project.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-date" className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5"/> Date</Label>
                <Input id="e-date" type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-amt" className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5"/> Amount</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">$</div>
                  <Input id="e-amt" type="number" min="0.01" step="0.01" className="pl-7" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} placeholder="45.00" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-cat" className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5"/> Category</Label>
              <Select value={expenseForm.category} onValueChange={v => setExpenseForm({...expenseForm, category: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software">Software & Services</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="legal">Legal & Admin</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-desc" className="flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5"/> Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="e-desc" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} placeholder="Domain renewal, asset pack..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveExpense} disabled={!expenseForm.date || !expenseForm.amount || !expenseForm.category || createExpense.isPending || updateExpense.isPending}>
              {createExpense.isPending || updateExpense.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}