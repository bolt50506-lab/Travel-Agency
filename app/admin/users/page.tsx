'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type User = { id:string; email:string; role:string; firstName:string; lastName:string; phone?:string; isActive:boolean; createdAt:string };
type Role = { id:string; name:string; description?:string; is_active:boolean };

export default function AdminUsersPage() {
  const [users,setUsers]=useState<User[]>([]);
  const [roles,setRoles]=useState<Role[]>([]);
  const [form,setForm]=useState<any>({});
  const [editing,setEditing]=useState<User|null>(null);
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [roleFilter,setRoleFilter]=useState('all');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);

  async function load() {
    setLoading(true);
    try {
      const [u,r]=await Promise.all([fetch('/api/admin/users'),fetch('/api/admin/roles')]);
      const ud=await u.json(), rd=await r.json();
      if(!u.ok) throw new Error(ud.error||'Unable to load users');
      setUsers(ud.users||[]);
      if(r.ok) setRoles(rd.roles||[]);
    } catch(e){toast.error(e instanceof Error?e.message:'Unable to load');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const filtered=users.filter(u=>(roleFilter==='all'||u.role===roleFilter)&&(!search||[u.email,u.firstName,u.lastName,u.phone].some(v=>String(v||'').toLowerCase().includes(search.toLowerCase()))));

  function startNew(){setEditing(null);setForm({role:'customer',isActive:true});setOpen(true);}
  function startEdit(u:User){setEditing(u);setForm({firstName:u.firstName,lastName:u.lastName,phone:u.phone||'',role:u.role,isActive:u.isActive,password:''});setOpen(true);}
  async function save(){
    if (!editing && (!String(form.email||'').trim() || !String(form.password||'').trim() || !String(form.firstName||'').trim())) { toast.error('Email, password and first name are required'); return; }
    if (!editing && String(form.password||'').length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.role === 'agent' && (Number(form.commissionRate ?? 0) < 0 || Number(form.commissionRate ?? 0) > 100)) { toast.error('Commission must be between 0% and 100%'); return; }
    setSaving(true);
    try{
      const response=await fetch('/api/admin/users',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing?{id:editing.id,...form}:form)});
      const result=await response.json(); if(!response.ok) throw new Error(result.error||'Unable to save');
      toast.success(editing?'User updated':'User created');setOpen(false);setForm({});setEditing(null);await load();
    }catch(e){toast.error(e instanceof Error?e.message:'Unable to save');}
    finally{setSaving(false);}
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold">Users</h1><p className="mt-1 text-sm text-muted-foreground">Create users, assign roles, change access and manage agent accounts.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button><Button onClick={startNew}><Plus className="mr-2 h-4 w-4"/>Add User</Button></div>
    </div>

    {open&&<Card className="p-5"><h2 className="mb-4 font-semibold">{editing?'Edit User':'Add User'}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!editing&&<div><Label>Email</Label><Input type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></div>}
        <div><Label>First name</Label><Input value={form.firstName||''} onChange={e=>setForm({...form,firstName:e.target.value})}/></div>
        <div><Label>Last name</Label><Input value={form.lastName||''} onChange={e=>setForm({...form,lastName:e.target.value})}/></div>
        <div><Label>Phone</Label><Input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div><Label>Role</Label><Select value={form.role||'customer'} onValueChange={v=>setForm({...form,role:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{roles.map(r=><SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent></Select></div>
        {form.role==='agent'&&<div><Label>Commission %</Label><Input type="number" min="0" max="100" step="0.01" value={form.commissionRate??0} onChange={e=>setForm({...form,commissionRate:e.target.value})}/></div>}
        {form.role==='agent'&&<div><Label>Agent code (optional)</Label><Input value={form.agentCode||''} onChange={e=>setForm({...form,agentCode:e.target.value})}/></div>}
        <div><Label>{editing?'New password (optional)':'Password'}</Label><Input type="password" value={form.password||''} onChange={e=>setForm({...form,password:e.target.value})}/></div>
        <div><Label>Status</Label><Select value={form.isActive===false?'false':'true'} onValueChange={v=>setForm({...form,isActive:v==='true'})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent></Select></div>
      </div>
      <div className="mt-4 flex gap-2"><Button disabled={saving} onClick={()=>void save()}>{saving?'Saving...':'Save'}</Button><Button variant="outline" onClick={()=>{setOpen(false);setEditing(null)}}>Cancel</Button></div>
    </Card>}

    <Card className="p-4"><div className="flex flex-wrap gap-2"><div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Search name, email or phone..." value={search} onChange={e=>setSearch(e.target.value)}/></div><Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Roles</SelectItem>{roles.map(r=><SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent></Select></div></Card>

    <Card className="p-4 overflow-x-auto">{loading?<p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>:<table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{filtered.map(u=><tr key={u.id} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{u.firstName} {u.lastName}</td><td className="px-3 py-3">{u.email}</td><td className="px-3 py-3"><Badge className="capitalize">{u.role}</Badge></td><td className="px-3 py-3">{u.isActive?'Active':'Inactive'}</td><td className="px-3 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td><td className="px-3 py-3"><Button size="sm" variant="outline" onClick={()=>startEdit(u)}><Pencil className="mr-1 h-3 w-3"/>Edit</Button></td></tr>)}</tbody></table>}</Card>
  </div>;
}
