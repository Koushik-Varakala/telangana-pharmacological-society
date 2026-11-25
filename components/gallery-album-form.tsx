import {saveGalleryAlbum} from '@/app/admin/actions';

type Album={id:string;title:string;description:string|null;event_date:string|null;published:boolean};

export function GalleryAlbumForm({album}:{album?:Album}){
  return <form action={saveGalleryAlbum} className="form-card admin-editor gallery-album-form">
    <input type="hidden" name="id" value={album?.id||''}/>
    <label>Album title<input name="title" required maxLength={180} defaultValue={album?.title}/></label>
    <label>Description<textarea name="description" rows={3} maxLength={2000} defaultValue={album?.description||''}/></label>
    <label>Event date<input name="event_date" type="date" defaultValue={album?.event_date||''}/></label>
    <label className="consent"><input name="published" type="checkbox" defaultChecked={album?.published}/><span>Publish this album. Photos appear on the public gallery only when the album is published.</span></label>
    <button className="button form-submit">{album?'Save album':'Create album'}</button>
  </form>;
}
