'use client';

import {useEffect, useRef, useState} from 'react';

type Photo={id:string;src:string;caption:string|null;albumTitle:string};

export function GalleryPhotoGrid({photos}:{photos:Photo[]}){
  const [selected,setSelected]=useState<Photo|null>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog)return;
    if(selected&&!dialog.open)dialog.showModal();
    if(!selected&&dialog.open)dialog.close();
  },[selected]);

  return <>
    <div className="gallery-grid">
      {photos.map(photo=><button className="gallery-photo" key={photo.id} type="button" onClick={()=>setSelected(photo)} aria-label={`View ${photo.caption||`photo from ${photo.albumTitle}`}`}>
        <img src={photo.src} alt={photo.caption||`Photo from ${photo.albumTitle}`}/>
        <span className="gallery-photo-caption">{photo.caption||'View photo'}</span>
        <span className="gallery-photo-zoom" aria-hidden="true">↗</span>
      </button>)}
    </div>
    <dialog className="gallery-lightbox" ref={dialogRef} onClose={()=>setSelected(null)} onCancel={event=>{event.preventDefault();setSelected(null)}} onClick={event=>{if(event.target===dialogRef.current)setSelected(null)}} aria-label={selected?.caption||`Photo from ${selected?.albumTitle||'Society gallery'}`}>
      {selected&&<div className="gallery-lightbox-content"><button type="button" className="gallery-lightbox-close" onClick={()=>setSelected(null)} aria-label="Close enlarged photo">×</button><img src={selected.src} alt={selected.caption||`Photo from ${selected.albumTitle}`}/>{selected.caption&&<p>{selected.caption}</p>}</div>}
    </dialog>
  </>;
}
