"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/project-form-dialog";

export function NewProjectDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="default" onClick={() => setOpen(true)}>
        <Plus />
        Novo projeto
      </Button>
      <ProjectFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
