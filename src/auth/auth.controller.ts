import { Body, Controller, Post } from '@nestjs/common';
import { AuthUserDto } from './dto/auth-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/register')
  registerUser(@Body() registerUserDto: AuthUserDto): Promise<void> {
    //create user
    return this.authService.registerUser(registerUserDto);
  }

  @Post('/login')
  loginUser(@Body() loginUserDto: AuthUserDto): Promise<{ token: string }> {
    return this.authService.loginUser(loginUserDto);
  }
}
