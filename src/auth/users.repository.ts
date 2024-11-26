import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AuthUserDto } from './dto/auth-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersRepository extends Repository<User> {
  private logger = new Logger(UsersRepository.name);
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async createUser(registerUserDto: AuthUserDto): Promise<void> {
    const { email, password } = registerUserDto;

    //hashing password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = this.create({
      email,
      password: hashedPassword,
    });

    //save user in a database
    try {
      await this.save(user);
    } catch (error) {
      if (error.code === 23505) {
        throw new ConflictException('Email already exists');
      } else {
        this.logger.error('Failed to save the user into database.');
        throw new InternalServerErrorException();
      }
    }
  }

  async findUser(userId: string): Promise<User> {
    return await this.findOneBy({ id: userId });
  }
}
