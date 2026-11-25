export type NoticeOptions={id?:string;tone?:'success'|'error';duration?:number;action?:{label:string;run:()=>Promise<void>|void}};
export function notify(message:string,options:NoticeOptions={}){if(message)window.dispatchEvent(new CustomEvent('insurance-notice',{detail:{message,...options,id:options.id||crypto.randomUUID()}}));}

export function dismissNotice(id:string){window.dispatchEvent(new CustomEvent('insurance-notice-dismiss',{detail:id}));}
