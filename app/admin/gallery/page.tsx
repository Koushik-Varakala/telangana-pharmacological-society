import {PageIntro} from '@/components/page-intro';
import {createSupabaseServerClient,hasSupabaseConfig} from '@/lib/supabase/server';
import {GalleryImageUploader} from '@/components/gallery-image-uploader';
import {DeleteGalleryAlbumForm,DeleteGalleryImageForm} from '@/components/delete-gallery-forms';
import {GalleryAlbumForm} from '@/components/gallery-album-form';

export default async function AdminGallery(){
  let albums:any[]=[];
  if(hasSupabaseConfig()){
    const db=await createSupabaseServerClient();
    const {data}=await db.from('gallery_albums').select('id,title,description,event_date,published,gallery_images(id,file_path,caption)').order('event_date',{ascending:false});
    albums=await Promise.all((data||[]).map(async album=>({
      ...album,
      gallery_images:await Promise.all((album.gallery_images||[]).map(async (image:{id:string;file_path:string;caption:string|null})=>{
        const {data:signed}=await db.storage.from('society-public-assets').createSignedUrl(image.file_path,3600);
        return {...image,url:signed?.signedUrl||''};
      })),
    })));
  }
  return <>
    <PageIntro eyebrow="Admin / Gallery" title="Gallery albums" description="Create albums and upload Society-approved event images to private Supabase Storage."/>
    <section className="section"><div className="wrap gallery-admin-grid">
      <section><h2>New album</h2><GalleryAlbumForm/></section>
      <section><h2>Albums & images</h2>{albums.map(album=><article className="admin-record gallery-admin-album" key={album.id}>
        <div className="admin-record-controls"><span className="eyebrow">{album.published?'Published':'Draft'}</span><span>{album.event_date||'Date not set'}</span></div>
        <h3>{album.title}</h3>
        <GalleryAlbumForm album={album}/>
        <GalleryImageUploader albumId={album.id}/>
        {album.gallery_images?.length>0&&<div className="gallery-admin-images">{album.gallery_images.map((image:{id:string;caption:string|null;url:string})=><div key={image.id} className="gallery-admin-image">
          {image.url&&<img src={image.url} alt={image.caption||''}/>}
          <DeleteGalleryImageForm id={image.id} caption={image.caption}/>
        </div>)}</div>}
        <DeleteGalleryAlbumForm id={album.id}/>
      </article>)}{!albums.length&&<div className="review-note">No albums yet.</div>}</section>
    </div></section>
  </>;
}
