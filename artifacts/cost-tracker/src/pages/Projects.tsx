import { useState } from "react";
import { Link } from "wouter";
import { 
  useListTrackedProjects, 
  useCreateTrackedProject, 
  useUpdateTrackedProject, 
  useDeleteTrackedProject,
  getListTrackedProjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Plus, MoreVertical, Pencil, Trash2, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function Projects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: projectsData, isLoading } = useListTrackedProjects();
  
  const createProject = useCreateTrackedProject();
  const updateProject = useUpdateTrackedProject();
  const deleteProject = useDeleteTrackedProject();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{id: number, name: string, description: string | null} | null>(null);

  const [formData, setFormData] = useState({ name: "", description: "" });

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    
    createProject.mutate({
      data: {
        name: formData.name,
        description: formData.description || null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTrackedProjectsQueryKey() });
        setIsCreateOpen(false);
        setFormData({ name: "", description: "" });
        toast({ title: "Project created" });
      }
    });
  };

  const handleEdit = () => {
    if (!selectedProject || !formData.name.trim()) return;
    
    updateProject.mutate({
      id: selectedProject.id,
      data: {
        name: formData.name,
        description: formData.description || null
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTrackedProjectsQueryKey() });
        setIsEditOpen(false);
        toast({ title: "Project updated" });
      }
    });
  };

  const handleDelete = () => {
    if (!selectedProject) return;
    
    deleteProject.mutate({
      id: selectedProject.id
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTrackedProjectsQueryKey() });
        setIsDeleteOpen(false);
        toast({ title: "Project deleted" });
      }
    });
  };

  const openEdit = (project: { id: number; name: string; description?: string | null }) => {
    setSelectedProject({ id: project.id, name: project.name, description: project.description ?? null });
    setFormData({ name: project.name, description: project.description || "" });
    setIsEditOpen(true);
  };

  const openDelete = (project: { id: number; name: string; description?: string | null }) => {
    setSelectedProject({ id: project.id, name: project.name, description: project.description ?? null });
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight font-serif text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">Manage your tracking workspaces.</p>
        </div>
        <Button onClick={() => { setFormData({name: "", description: ""}); setIsCreateOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      ) : projectsData?.projects && projectsData.projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsData.projects.map((project) => (
            <Card key={project.id} className="flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md group bg-card border-border">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-2">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(project)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDelete(project)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="font-serif text-xl font-semibold mb-2">{project.name}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                  {project.description || "No description provided."}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
                  </span>
                  <Link href={`/projects/${project.id}`} className="text-sm font-medium text-primary hover:underline">
                    Open ledger
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-16 flex flex-col items-center justify-center text-center border-dashed bg-muted/20">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-serif font-medium mb-2">No projects found</h3>
          <p className="text-muted-foreground mb-6 max-w-md">Create your first project to start logging time and expenses.</p>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline">Create Project</Button>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif">New Project</DialogTitle>
            <DialogDescription>Create a new workspace for tracking costs.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Personal Website" 
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                placeholder="Brief details about this project..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim() || createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input 
                id="edit-name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea 
                id="edit-description" 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!formData.name.trim() || updateProject.isPending}>
              {updateProject.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? This will permanently remove the project and all its associated time and expense entries. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}