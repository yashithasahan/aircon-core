"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Plus } from "lucide-react"
import { EntityDialog } from "./entity-dialogs"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Entity {
    id: string
    name: string
    [key: string]: any
}

interface EntityListProps {
    title: string
    data: Entity[]
    onCreate: (name: string) => Promise<any>
    onUpdate: (id: string, name: string) => Promise<any>
    onDelete: (id: string) => Promise<any>
}

export function EntityList({ title, data, onCreate, onUpdate, onDelete }: EntityListProps) {
    const router = useRouter()
    const [createOpen, setCreateOpen] = useState(false)

    const [editOpen, setEditOpen] = useState(false)
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

    const [deleteOpen, setDeleteOpen] = useState(false)
    const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null)

    // Handlers
    const handleEdit = (entity: Entity) => {
        setSelectedEntity(entity)
        setEditOpen(true)
    }

    const handleDeleteClick = (entity: Entity) => {
        setEntityToDelete(entity)
        setDeleteOpen(true)
    }

    const confirmDelete = async () => {
        if (!entityToDelete) return
        try {
            await onDelete(entityToDelete.id)
            toast.success("Deleted successfully")
            setDeleteOpen(false)
            router.refresh()
        } catch (error: any) {
            toast.error("Failed to delete. It might be in use.")
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">{title}</CardTitle>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add New
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                        <p>No items found.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                <Pencil className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Create Dialog */}
            <EntityDialog
                mode="create"
                entityName={title} // e.g. "Agent" (singularize manually if easy, else just use title)
                open={createOpen}
                onOpenChange={setCreateOpen}
                onSave={async (name) => {
                    await onCreate(name)
                    router.refresh()
                }}
            />

            {/* Edit Dialog */}
            {selectedEntity && (
                <EntityDialog
                    mode="edit"
                    entityName={title}
                    entityId={selectedEntity.id}
                    initialName={selectedEntity.name}
                    open={editOpen}
                    onOpenChange={setEditOpen}
                    onSave={async (name, id) => {
                        if (id) {
                            await onUpdate(id, name)
                            router.refresh()
                        }
                    }}
                />
            )}

            {/* Delete Alert */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. If this {title} is attached to existing bookings, deletion may fail.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
