'use client';
import {deleteEventProgramItem} from '@/app/admin/actions';

export function DeleteEventProgramItemForm({id,kind}:{id:string;kind:'speaker'|'schedule'}){
  const label=kind==='speaker'?'speaker':'schedule item';
  return <form action={deleteEventProgramItem} onSubmit={event=>{if(!window.confirm(`Remove this ${label} from the event?`))event.preventDefault()}}>
    <input type="hidden" name="id" value={id}/>
    <input type="hidden" name="kind" value={kind}/>
    <button className="admin-delete-button" type="submit">Remove</button>
  </form>;
}
