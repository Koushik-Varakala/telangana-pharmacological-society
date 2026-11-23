'use client';
import {deletePublication} from '@/app/admin/actions';

export function DeletePublicationForm({id}:{id:string}){
  return <form action={deletePublication} onSubmit={event=>{if(!window.confirm('Delete this publication? Its record will be removed from the website.'))event.preventDefault()}}>
    <input type="hidden" name="id" value={id}/>
    <button className="admin-delete-button" type="submit">Delete</button>
  </form>;
}
