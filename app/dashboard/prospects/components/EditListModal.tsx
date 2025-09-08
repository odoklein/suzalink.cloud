import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Form schema
const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: any;
  onSuccess: () => void;
}

export function EditListModal({ open, onOpenChange, list, onSuccess }: EditListModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    }
  });

  // Update form values when list changes
  useEffect(() => {
    if (list) {
      form.reset({
        name: list.name || "",
        description: list.description || "",
      });
    }
  }, [list, form]);

  const onSubmit = async (values: FormValues) => {
    if (!list) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/prospects/lists/${list.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Échec de la modification de la liste");
      }

      toast.success("Liste modifiée avec succès");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Échec de la modification de la liste");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!list) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier la Liste de Prospects</DialogTitle>
          <DialogDescription>
            Modifiez les détails de votre liste de prospects
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la Liste</FormLabel>
                  <FormControl>
                    <Input placeholder="Entrez le nom de la liste" {...field} />
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
                  <FormLabel>Description (Optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Entrez une description pour cette liste"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Modification..." : "Modifier Liste"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
