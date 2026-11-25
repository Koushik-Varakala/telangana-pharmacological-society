'use client';
import {deleteAnnouncement} from '@/app/admin/actions';

export function DeleteAnnouncementForm({id}:{id:string}){
  return <form action={deleteAnnouncement} onSubmit={event=>{if(!window.confirm('Permanently delete this announcement? It will be removed from the website and news history.'))event.preventDefault()}}>
    <input type="hidden" name="id" value={id}/>
    <button className="admin-delete-button" type="submit">Delete</button>
  </form>;
}
