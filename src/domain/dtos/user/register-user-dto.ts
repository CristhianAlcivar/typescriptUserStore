import { regularExps } from "../../../config";

export class RegisterUserDto {
    private constructor(
        public name: string,
        public email: string,
        public password: string,
    ){}

    static create(object:{[key:string]:any}):[string?,RegisterUserDto?]{
        const { name, email, password} = object;

        if(!name) return['Missin name'];
        if(!email) return['Missin email'];
        if(!regularExps.email.test(email)) return['Email is not valid'];
        if(!password) return['Missin password'];
        if(password.length<6) return['Password too short'];

        return [undefined,new RegisterUserDto(name,email,password)];
    }
}