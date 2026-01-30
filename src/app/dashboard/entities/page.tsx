import {
    getAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    getBookingTypes,
    createBookingType,
    updateBookingType,
    deleteBookingType,
    getPlatforms,
    createPlatform,
    updatePlatform,
    deletePlatform
} from "@/app/dashboard/bookings/actions"
import { EntityList } from "@/components/dashboard/entity-management/entity-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function EntitesPage() {
    const [agents, bookingTypes, platforms] = await Promise.all([
        getAgents(),
        getBookingTypes(),
        getPlatforms()
    ])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Entity Management</h2>
            </div>
            <Tabs defaultValue="agents" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="agents">Agents</TabsTrigger>
                    <TabsTrigger value="issued_from">Issued From</TabsTrigger>
                    <TabsTrigger value="platforms">Platforms</TabsTrigger>
                </TabsList>
                <TabsContent value="agents" className="space-y-4">
                    <EntityList
                        title="Agent"
                        data={agents || []}
                        onCreate={createAgent}
                        onUpdate={updateAgent}
                        onDelete={deleteAgent}
                    />
                </TabsContent>
                <TabsContent value="issued_from" className="space-y-4">
                    <EntityList
                        title="Issued From Source"
                        data={bookingTypes || []}
                        onCreate={createBookingType}
                        onUpdate={updateBookingType}
                        onDelete={deleteBookingType}
                    />
                </TabsContent>
                <TabsContent value="platforms" className="space-y-4">
                    <EntityList
                        title="Platform"
                        data={platforms || []}
                        onCreate={createPlatform}
                        onUpdate={updatePlatform}
                        onDelete={deletePlatform}
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
