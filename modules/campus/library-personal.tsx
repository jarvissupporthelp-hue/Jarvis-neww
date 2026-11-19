"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getClient } from "@/lib/browser-supabase";

export const avatars = ["🌙","🦊","🐼","🦉","🌻","🐳"];
export type Language = "en" | "hy" | "fr" | "ru";
export const labels = {
 en:["Reading shelf","Want to read","Reading now","Already read","Liked","All books","Profile","App language","Avatar","Upload photo","Save","Saved","Sign in","Reading status","Like","Remove like"],
 hy:["Իմ գրադարանը","Կարդալ հետո","Այժմ կարդում եմ","Արդեն կարդացել եմ","Հավանած","Բոլոր գրքերը","Անձնական էջ","Հավելվածի լեզու","Ավատար","Վերբեռնել նկար","Պահպանել","Պահպանված է","Մուտք","Կարգավիճակ","Հավանել","Չեղարկել հավանումը"],
 fr:["Ma bibliothèque","À lire","En cours","Lu","Favoris","Tous les livres","Profil","Langue de l’application","Avatar","Importer une photo","Enregistrer","Enregistré","Connexion","Statut de lecture","Aimer","Retirer des favoris"],
 ru:["Моя библиотека","Хочу прочитать","Читаю","Прочитано","Избранное","Все книги","Профиль","Язык приложения","Аватар","Загрузить фото","Сохранить","Сохранено","Войти","Статус чтения","Нравится","Убрать отметку"],
};
export type Entry = {book_id:string; status:string; liked:boolean};
export function useLibrary(initial: Language, includeShelf = true) {
 const [user,setUser]=useState("");
 const [language,setLanguage]=useState(initial);
 const [avatar,setAvatar]=useState("");
 const [entries,setEntries]=useState<Entry[]>([]);
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let alive=true;
  async function load(){
   const db=getClient(); const {data}=await db.auth.getUser();
   if(!alive||!data.user)return;
   const id=data.user.id;
   const [profile,shelf]=await Promise.all([db.from("library_profiles").select("language,avatar").eq("user_id",id).maybeSingle(),includeShelf ? db.from("library_shelf").select("book_id,status,liked").eq("user_id",id) : Promise.resolve({data:[],error:null})]);
   if(!alive)return;
   if(profile.error||shelf.error){setNotice("Could not load your library profile.");return;}
   setLanguage(profile.data?.language??initial);setAvatar(profile.data?.avatar??avatars[parseInt(id.slice(0,8),16)%avatars.length]);
   setEntries(shelf.data??[]);setUser(id);
  }
  load().catch(()=>alive&&setNotice("Library profile unavailable."));
  return ()=>{alive=false;};
 },[initial,includeShelf]);
 async function saveBook(book_id:string, change:Partial<Pick<Entry,"status"|"liked">>){
  if(!user||busy)return;
  setBusy(true);
  try {
   const {data,error}=await getClient().from("library_shelf").upsert({user_id:user,book_id,...change},{onConflict:"user_id,book_id"}).select("book_id,status,liked").single();
   if(error)throw error;
   setEntries(old=>[...old.filter(e=>e.book_id!==book_id),data]);setNotice("");
  }catch{setNotice("Could not save this book. Please retry.");}finally{setBusy(false);}
 }
 return {user,language,setLanguage,avatar,setAvatar,entries,notice,setNotice,busy,saveBook};
}
export function Avatar({value}:{value:string}){
 return value.startsWith("data:image/jpeg;base64,")?<Image unoptimized src={value} alt="" width="48" height="48" className="size-12 rounded-full object-cover"/>:<span aria-hidden="true" className="text-3xl">{value}</span>;
}
