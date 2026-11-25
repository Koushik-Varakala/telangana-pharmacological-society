'use client';
import {deleteContentRecord} from '@/app/admin/actions';

export function DeleteContentForm({id,kind,label}:{id:string;kind:'committee'|'resources';label:string}){
  return <form action={deleteContentRecord} onSubmit={event=>{if(!window.confirm(`Permanently delete this ${label.toLowerCase()} record?`))event.preventDefault()}}>
    <input type="hidden" name="id" value={id}/>
    <input type="hidden" name="kind" value={kind}/>
    <button className="admin-delete-button" type="submit">Delete</button>
  </form>;
}
