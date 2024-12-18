import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthUserDto } from './dto/auth-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(UsersRepository)
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
  ) {}

  async registerUser(registerUserDto: AuthUserDto): Promise<void> {
    const { email } = registerUserDto;
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user) {
      throw new ConflictException('Email is already in use.');
    }
    return this.usersRepository.createUser(registerUserDto);
  }

  async loginUser(loginUserDto: AuthUserDto): Promise<{ token: string }> {
    const { email, password } = loginUserDto;

    const user = await this.usersRepository.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      //user exists and password is correct
      const payload: JwtPayload = { userId: user.id, email }; //create token payload
      const token: string = await this.jwtService.sign(payload);
      return { token };
    } else {
      //no user or wrong password
      this.logger.error('Wrong login credentials.');
      throw new UnauthorizedException('Please check your login credentials.');
    }
  }
}
