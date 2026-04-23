import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateFeatureRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { getListFeatureRequestsQueryKey, getGetFeatureBoardStatsQueryKey } from "@workspace/api-client-react";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120, "Title must be less than 120 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  submittedBy: z.string().optional(),
  hp: z.string().optional(),
});

export function SubmitIdeaModal() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      submittedBy: "",
      hp: "",
    },
  });

  const createRequest = useCreateFeatureRequest();

  function onSubmit(values: z.infer<typeof formSchema>) {
    createRequest.mutate(
      {
        data: {
          title: values.title,
          description: values.description,
          submittedBy: values.submittedBy || undefined,
          hp: values.hp || undefined,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListFeatureRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFeatureBoardStatsQueryKey() });
          toast({
            title: "Idea submitted!",
            description: "Your feature request has been added to the board.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to submit idea. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="font-semibold shadow-lg hover-elevate" size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Submit Idea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit a Feature Idea</DialogTitle>
          <DialogDescription>
            What should we build next? Add your idea to the board.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Dark Mode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why do you need this feature?"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="submittedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Anonymous" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Honeypot field - hidden from users */}
            <FormField
              control={form.control}
              name="hp"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormLabel>Do not fill this out</FormLabel>
                  <FormControl>
                    <Input tabIndex={-1} autoComplete="off" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? "Submitting..." : "Submit Idea"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
