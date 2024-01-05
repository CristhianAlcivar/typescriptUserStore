import { JwtAdapter, bcryptAdapter, envs } from "../../config";
import { UserModel } from "../../data";
import { CustomError, RegisterUserDto, UserEntity } from "../../domain";
import { LoginUserDto } from "../../domain/dtos/auth/login-user.dto";
import { EmailService } from "./email.service";

export class AuthService {
  constructor(private readonly emailService: EmailService) {}

  public async registerUser(registerUserDto: RegisterUserDto) {
    const existUser = await UserModel.findOne({
      email: registerUserDto.email,
    });

    if (existUser) throw CustomError.badRequest("Email already exist");

    try {
      const user = new UserModel(registerUserDto);

      //encriptar la contraseña
      user.password = bcryptAdapter.hash(registerUserDto.password);
      await user.save();

      const { password, ...userEntity } = UserEntity.fromObject(user);
      //JWT
      const token = await JwtAdapter.generateToken({
        id: user.id,
      });

      if (!token) throw CustomError.internalServer("Error while creating JWT");
      //Email de confirmacion

      await this.sendEmailValidationLink(user.email);

      return {
        user: userEntity,
        token: token,
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }
  public async loginUser(loginUserDto: LoginUserDto) {
    try {
      const user = await UserModel.findOne({ email: loginUserDto.email });

      if (!user) throw CustomError.badRequest("Email no exist");

      const isMatching = bcryptAdapter.compare(
        loginUserDto.password,
        user.password
      );

      if (!isMatching) throw CustomError.badRequest("Password is not valid");

      const { password, ...userEntity } = UserEntity.fromObject(user);

      const token = await JwtAdapter.generateToken({
        id: user.id,
      });

      if (!token) throw CustomError.internalServer("Error while creating JWT");
      return {
        user: userEntity,
        token: token,
      };
    } catch (error) {
      throw CustomError.internalServer(`${error}`);
    }
  }
  private sendEmailValidationLink = async (email: string) => {
    const token = await JwtAdapter.generateToken({ email });
    if (!token) throw CustomError.internalServer("Error getting token");

    const link = `${envs.WEBSERVICES_URL}/auth/validate-email/${token}`;
    const html = `
    <div style="font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0;">

        <div style="max-width: 600px; margin: 20px auto; background-color: #fff; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #007BFF;">Bienvenido a Nuestra Comunidad</h1>
            <p style="line-height: 1.6;">Estimado,</p>
            <p style="line-height: 1.6;">¡Gracias por unirte a nuestra comunidad! Estamos emocionados de tenerte con nosotros.</p>
            <p style="line-height: 1.6;">Con tu cuenta, tendrás acceso a increíbles recursos y oportunidades. ¡Esperamos que disfrutes de la experiencia!</p>
            <p style="line-height: 1.6;">Para comenzar, puedes explorar nuestro sitio web y participar en las actividades disponibles.</p>
            <p style="line-height: 1.6;">Si tienes alguna pregunta o necesitas ayuda, no dudes en ponerte en contacto con nuestro equipo de soporte.</p>
            <p style="line-height: 1.6;">¡Bienvenido nuevamente y disfruta tu estancia!</p>
            <a href="${link}" style="display: inline-block; padding: 10px 20px; font-size: 16px; text-decoration: none; background-color: #007BFF; color: #fff; border-radius: 5px;">Explorar Ahora</a>
        </div>

    </div>
    `;
    const options = {
        to:email,
        subject: 'Validate your email',
        htmlBody: html,
    }
    const isSet = await this.emailService.sendEmail(options);

    if(!isSet) throw CustomError.internalServer('Error sending email');

    return true;
  };
  public validateEmail = async(token:string)=>{
    const payload = await JwtAdapter.validateToken(token);
    if(!payload) throw CustomError.unauthorized('Invalid Token');
    
    const {email} = payload as {email:string};
    if(!email) throw CustomError.internalServer('Email not in token');

    const user = await UserModel.findOne({email});
    if(!user) throw CustomError.internalServer('Email not exists');

    user.emailValidated = true;
    await user.save();

    return true
  }
}
