"use client";
import { useState, type FormEvent } from "react";
import { getClient } from "@/lib/browser-supabase";
import type { WorkspaceLanguage } from "@/lib/workspace-language";

const copy = {
 en:["Change password","Current password","New password","Password updated","Could not change password. Check your current password and try again.","Log out","Could not log out."],
 hy:["Փոխել գաղտնաբառը","Ընթացիկ գաղտնաբառ","Նոր գաղտնաբառ","Գաղտնաբառը փոխվել է","Ստուգեք ընթացիկ գաղտնաբառը և կրկին փորձեք։","Դուրս գալ","Չհաջողվեց դուրս գալ։"],
 fr:["Changer le mot de passe","Mot de passe actuel","Nouveau mot de passe","Mot de passe modifié","Vérifiez le mot de passe actuel et réessayez.","Se déconnecter","La déconnexion a échoué."],
 ru:["Изменить пароль","Текущий пароль","Новый пароль","Пароль изменён","Проверьте текущий пароль и повторите попытку.","Выйти","Не удалось выйти."],
};
export function AccountActions({language}:{language:WorkspaceLanguage}) {
 const t=copy[language], [busy,setBusy]=useState(false), [message,setMessage]=useState("");
 async function change(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const form=event.currentTarget, fields=new FormData(form), auth=getClient().auth;
  setBusy(true);setMessage("");
  try{
   const {data,error}=await auth.getUser();
   if(error||!data.user.email)throw Error();
   const verified=await auth.signInWithPassword({email:data.user.email,password:String(fields.get("current"))});
   if(verified.error)throw verified.error;
   const updated=await auth.updateUser({password:String(fields.get("new"))});
   if(updated.error)throw updated.error;
   form.reset();setMessage(t[3]);
  }catch{setMessage(t[4]);}finally{setBusy(false);}
 }
 async function logout(){
  setBusy(true);
  try{const {error}=await getClient().auth.signOut({scope:"local"});if(error)throw error;location.replace("/account");}
  catch{setMessage(t[6]);setBusy(false);}
 }
 return <section className="space-y-4 border-t pt-5"><form onSubmit={change}><fieldset disabled={busy} className="space-y-3"><legend className="font-semibold">{t[0]}</legend>{[["current",t[1],"current-password"],["new",t[2],"new-password"]].map(([name,title,complete])=><label className="block" key={name}>{title}<input className="block w-full rounded border p-2" type="password" name={name} autoComplete={complete} required minLength={name==="new"?8:1}/></label>)}<button className="jarvis-primary-button">{t[0]}</button></fieldset></form><p role="status">{message}</p><button disabled={busy} onClick={logout} className="underline">{t[5]}</button></section>;
}
