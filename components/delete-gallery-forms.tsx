'use client';
import {deleteGalleryAlbum,deleteGalleryImage,saveGalleryImageCaption} from '@/app/admin/actions';

export function DeleteGalleryAlbumForm({id}:{id:string}){
  return <form action={deleteGalleryAlbum} onSubmit={event=>{if(!window.confirm('Delete this gallery album and all its photos? This cannot be undone.'))event.preventDefault()}}>
    <input type="hidden" name="id" value={id}/>
    <button className="admin-delete-button" type="submit">Delete album</button>
  </form>;
}

export function DeleteGalleryImageForm({id,caption}:{id:string;caption:string|null}){
  return <div className="gallery-image-admin-actions"><form action={saveGalleryImageCaption} className="gallery-caption-form">
    <input type="hidden" name="id" value={id}/>
    <label>Photo caption<input name="caption" maxLength={240} defaultValue={caption||''}/></label>
    <button className="text-button" type="submit">Save caption</button>
  </form><DeletePhotoButton id={id}/></div>;
}

function DeletePhotoButton({id}:{id:string}){
  return <form action={deleteGalleryImage} onSubmit={event=>{if(!window.confirm('Delete this gallery photo? This cannot be undone.'))event.preventDefault()}}>
    <input type="hidden" name="id" value={id}/>
    <button className="admin-delete-button" type="submit">Delete photo</button>
  </form>;
}
