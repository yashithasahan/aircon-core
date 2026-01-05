'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPassengers() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('passengers')
        .select('*')
        .order('surname', { ascending: true })

    if (error) {
        console.error('Error fetching passengers:', error)
        return []
    }

    return data
}

export async function createPassenger(formData: FormData) {
    const supabase = await createClient()

    const title = formData.get('title') as string
    const surname = formData.get('surname') as string
    const first_name = formData.get('first_name') as string
    const passport_number = formData.get('passport_number') as string
    const phone_number = formData.get('phone_number') as string
    const passenger_type = formData.get('passenger_type') as string || 'ADULT'
    const contact_info = formData.get('contact_info') as string

    // Construct full name for legacy support or display
    const name = `${title} ${surname} ${first_name}`.trim()

    if (!surname || !first_name) return { error: "Surname and First Name are required" }

    const { data, error } = await supabase
        .from('passengers')
        .insert([{
            title,
            surname,
            first_name,
            name,
            passport_number,
            contact_info,
            phone_number,
            passenger_type
        }])
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
