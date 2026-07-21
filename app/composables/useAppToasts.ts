
const tostStatus = ["primary", "secondary", "success", "info", "warning", "error", "neutral" ] as const;
type TostStatusType = typeof tostStatus[number];

export const useAppToasts = () => {
    const toast = useToast();
    const showTost = (title:string, msg:string, status:TostStatusType, icon:string, pausa:number) => {
        return toast.add({
        title: title,
        description: msg,
        color: status,
        icon: icon,
        duration: pausa,
        })
    }
    return {showTost, removeToast: (id: string | number) => toast.remove(id)}
}