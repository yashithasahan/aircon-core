'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPassengers() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching passengers:', error)
        return []
    }

    return data
}

export async function createPassenger(formData: FormData) {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const passport_number = formData.get('passport_number') as string
    const contact_info = formData.get('contact_info') as string

    if (!name) return { error: "Name is required" }

    const { data, error } = await supabase
        .from('passengers')
        .insert([{ name, passport_number, contact_info }])
        .select()
        .single()

    if (error) {
        console.error('Error creating passenger:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/passengers')
    return { data }
}

export async function deletePassenger(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('passengers')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/passengers')
}
