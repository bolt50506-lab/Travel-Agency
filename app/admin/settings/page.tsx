'use client';

import { useEffect, useState } from 'react';
import { Save, Plus, Pencil, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

type Role={id:string;name:string;description?:string;permissions:any[];is_active:boolean};

export default function AdminSettingsPage(){
 const [settings,setSettings]=useState<any>({agency:{},booking:{},notifications:{}});
 const [roles,setRoles]=useState<Role[]>([]);
 const [role,setRole]=useState<any>({name:'',description:'',permissions:[]});
 const [editingRole,setEditingRole]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const [s,r]=await Promise.all([fetch('/api/admin/settings'),fetch('/api/admin/roles')]);const sd=await s.json(),rd=await r.json();if(!s.ok)throw new Error(sd.error||'Unable to load settings');setSettings(sd.settings||{});setRoles(rd.roles||[]);}catch(e){toast.error(e instanceof Error?e.message:'Unable to load')}finally{setLoading(false)}}
 useEffect(()=>{void load()},[]);
 async function saveSettings(){const res=await fetch('/api/admin/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings})});const d=await res.json();if(!res.ok)throw new Error(d.error||'Unable to save');toast.success('Settings saved');}
 async function saveRole(){const method=editingRole?'PATCH':'POST';const res=await fetch('/api/admin/roles',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(editingRole?{id:editingRole,...role}:role)});const d=await res.json();if(!res.ok)throw new Error(d.error||'Unable to save role');toast.success('Role saved');setRole({name:'',description:'',permissions:[]});setEditingRole(null);await load();}
 return <div className="space-y-6">
  <div className="flex items-end justify-between"><div><h1 className="text-2xl font-bold">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Manage agency defaults, booking behaviour, notifications and roles.</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div>
  {loading?<p>Loading...</p>:<>
   <Card className="p-5"><h2 className="font-semibold mb-4">Agency settings</h2><div className="grid gap-4 sm:grid-cols-2"><div><Label>Agency name</Label><Input value={settings.agency?.name||''} onChange={e=>setSettings({...settings,agency:{...settings.agency,name:e.target.value}})}/></div><div><Label>Email</Label><Input value={settings.agency?.email||''} onChange={e=>setSettings({...settings,agency:{...settings.agency,email:e.target.value}})}/></div><div><Label>Phone</Label><Input value={settings.agency?.phone||''} onChange={e=>setSettings({...settings,agency:{...settings.agency,phone:e.target.value}})}/></div><div><Label>City</Label><Input value={settings.agency?.city||''} onChange={e=>setSettings({...settings,agency:{...settings.agency,city:e.target.value}})}/></div><div className="sm:col-span-2"><Label>Address</Label><Textarea value={settings.agency?.address||''} onChange={e=>setSettings({...settings,agency:{...settings.agency,address:e.target.value}})}/></div></div></Card>
   <Card className="p-5"><h2 className="font-semibold mb-4">Booking defaults</h2><div className="grid gap-4 sm:grid-cols-2"><div><Label>Default markup %</Label><Input type="number" min="0" value={settings.booking?.default_markup_percent??12} onChange={e=>setSettings({...settings,booking:{...settings.booking,default_markup_percent:Number(e.target.value)}})}/></div><div><Label>Default commission %</Label><Input type="number" min="0" max="100" value={settings.booking?.default_commission_percent??0} onChange={e=>setSettings({...settings,booking:{...settings.booking,default_commission_percent:Number(e.target.value)}})}/></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">Require payment before fulfillment</p><p className="text-xs text-muted-foreground">Keep supplier fulfillment blocked until payment is verified.</p></div><Switch checked={settings.booking?.require_payment_before_fulfillment!==false} onCheckedChange={v=>setSettings({...settings,booking:{...settings.booking,require_payment_before_fulfillment:v}})}/></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">Automatic supplier booking</p><p className="text-xs text-muted-foreground">Allow automatic fulfillment where an integration supports it.</p></div><Switch checked={Boolean(settings.booking?.automatic_supplier_booking)} onCheckedChange={v=>setSettings({...settings,booking:{...settings.booking,automatic_supplier_booking:v}})}/></div></div><Button className="mt-4" onClick={()=>void saveSettings().catch(e=>toast.error(e.message))}><Save className="mr-2 h-4 w-4"/>Save Settings</Button></Card>
   <Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Roles</h2><p className="text-sm text-muted-foreground">Create and edit role names, descriptions and permission keys.</p></div><Button onClick={()=>{setRole({name:'',description:'',permissions:[]});setEditingRole(null)}}><Plus className="mr-2 h-4 w-4"/>New Role</Button></div>
    <div className="mt-4 space-y-3">{roles.map(r=><div key={r.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.description||'No description'} · {r.is_active?'Active':'Inactive'}</p></div><Button variant="outline" size="sm" onClick={()=>{setEditingRole(r.id);setRole({name:r.name,description:r.description||'',permissions:r.permissions||[]})}}><Pencil className="mr-1 h-3 w-3"/>Edit</Button></div>)}</div>
    {(role.name!==''||editingRole)&&<div className="mt-5 rounded-lg bg-muted/30 p-4 space-y-3"><div><Label>Role name</Label><Input value={role.name} onChange={e=>setRole({...role,name:e.target.value})}/></div><div><Label>Description</Label><Input value={role.description} onChange={e=>setRole({...role,description:e.target.value})}/></div><div><Label>Permissions (comma separated)</Label><Input value={(role.permissions||[]).join(', ')} onChange={e=>setRole({...role,permissions:e.target.value.split(',').map((x:string)=>x.trim()).filter(Boolean)})}/></div><div className="flex gap-2"><Button onClick={()=>void saveRole().catch(e=>toast.error(e.message))}>Save Role</Button><Button variant="outline" onClick={()=>{setRole({name:'',description:'',permissions:[]});setEditingRole(null)}}>Cancel</Button></div></div>}
   </Card>
  </>}
 </div>
}
