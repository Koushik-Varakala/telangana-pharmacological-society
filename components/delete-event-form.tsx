'use client';
import {deleteEvent} from '@/app/admin/actions';

export function DeleteEventForm({id,hasRegistrations=false}:{id:string;hasRegistrations?:boolean}){
  if(hasRegistrations)return <span className="admin-delete-blocked" title="Unpublish this event to preserve its registration records.">Unpublish to remove</span>;
  return <form action={deleteEvent} onSubmit={event=>{if(!window.confirm('Delete this event? This removes its event details, speakers and schedule.'))event.preventDefault()}}>
    <input type="hidden" name="id" value={id}/>
    <button className="admin-delete-button" type="submit">Delete event</button>
  </form>;
}
