"use client";
import { createContext,useContext,useCallback } from "react";
import { interfaceCopy } from "@/lib/interface-copy";
export const InterfaceLanguage = createContext("en");
export function useInterfaceCopy(){
 const language=useContext(InterfaceLanguage);
 const index=language==="hy"?0:language==="fr"?1:language==="ru"?2:undefined;
 return useCallback((value:string)=>index===undefined?value:interfaceCopy[value]?.[index]??value,[index]);
}
export function UiText({value}:{value:string}){return useInterfaceCopy()(value);}
