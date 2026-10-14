import { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/state/store';
import { errorMessage } from '@/lib/api';
import type { ClothingItem } from '@/types/fashion';
export function LaundryControl({item}:{item:ClothingItem}){
 const {setLaundryStatus}=useApp();const [saving,setSaving]=useState(false);
 return <label className="mt-3 block text-xs text-soot">Laundry status<select aria-label={`Laundry status for ${item.product_name}`} value={item.laundry_status??'clean'} disabled={saving} onChange={async e=>{const status=e.target.value as 'clean'|'in-laundry';setSaving(true);try{await setLaundryStatus(item.item_id,status);toast.success(status==='clean'?'Piece marked clean':'Piece moved to laundry');}catch(err){toast.error('Couldn’t save laundry status',{description:errorMessage(err)});}finally{setSaving(false);}}} className="mt-1 block w-full rounded border border-charcoal/20 bg-surface p-2 text-sm disabled:opacity-50"><option value="clean">Clean</option><option value="in-laundry">In laundry</option></select></label>;
}
