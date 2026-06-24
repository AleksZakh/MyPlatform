
export const loginNormal = (insertLigin:string):string => {

    if (!insertLigin) return insertLigin;

    const cleanLogin = insertLigin.includes('\\') ? insertLigin.split('\\')[1] : insertLigin.split('@')[0];

    
    
    if (insertLigin.length <= 2) {
        return insertLigin.toUpperCase();    }
    
    const first = insertLigin.charAt(0).toUpperCase();
    const middle = insertLigin.slice(1, -2);
    const lastTwo = insertLigin.slice(-2).toUpperCase();
    
    return first + middle + lastTwo;
}

