import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundError } from 'rxjs';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findOneByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ phone });
  }
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    if (updateUserDto.email === '') {
      throw new BadRequestException(
        `این ایمیل قبلا توسط کاربر دیگری استفاده شده است`,
      );
    }
    if (!updateUserDto.phone || !updateUserDto.name) {
      throw new BadRequestException(
        `پارامتر های ارسالی اشتباه وارد شده است لطفا مچدد بررسی فرمایید`,
      );
    }

    if (updateUserDto.email) {
      const isUserEmailExist = await this.findOneByEmail(updateUserDto.email);

      if (isUserEmailExist && isUserEmailExist.id !== id)
        throw new BadRequestException(
          `این ایمیل قبلا توسط کاربر دیگری استفاده شده است`,
        );
    }
    if (updateUserDto.email) {
      const isUserEmailExist = await this.findOneByEmail(updateUserDto.email);

      if (isUserEmailExist && isUserEmailExist.id !== id)
        throw new BadRequestException(
          `این ایمیل قبلا توسط کاربر دیگری استفاده شده است`,
        );
    }

    if (updateUserDto.cardNumber) {
      const user = await this.usersRepository.findOneBy({
        cardNumber: updateUserDto.cardNumber,
      });
      if (user && user.id !== id)
        throw new BadRequestException(
          `این شماره کارت قبلا توسط کاربر دیگری استفاده شده است`,
        );
    }

    if (updateUserDto.shebaNumber) {
      const user = await this.usersRepository.findOneBy({
        shebaNumber: updateUserDto.shebaNumber,
      });

      if (user && user.id !== id)
        throw new BadRequestException(
          `این شماره شبا قبلا توسط کاربر دیگری استفاده شده است`,
        );
    }

    if (updateUserDto.phone) {
      const isUserPhoneExist = await this.findOneByPhone(updateUserDto.phone);
      if (isUserPhoneExist && isUserPhoneExist.id !== id)
        throw new BadRequestException(
          `کاربری قبلا با این شماره نلفن ثبت نام کرده است.`,
        );
    }
    await this.usersRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async updatePassword(
    id: number,
    updatPasswordDto: { oldPassword: string; newPassword: string },
  ) : Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: {
        id: id,
      },
      select: [
        'id',
        'password',
      ],
    });
    if (!user || !user.id) {
      throw new NotFoundException('کاربر یافت نشد');
    }
    if (!updatPasswordDto.newPassword || updatPasswordDto.newPassword.length < 7) {
      throw new BadRequestException('رمز عبور جدید باید حداقل 8 کاراکتر باشد.');
    }
    const isPasswordValid = await bcrypt.compare(
      updatPasswordDto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('رمز عبور مطابقت داده نشد.');
    }

    // 1. Hash the new password before saving it (10 is the standard salt rounds)

    const hashedPassword = await bcrypt.hash(updatPasswordDto.newPassword, 10);
    // 2. Update ONLY the password field in the database
    await this.usersRepository.update(id, {
      password: hashedPassword,
    });

    // 3. Return a success message
    return { message: 'رمز عبور با موفقیت تغییر یافت.' };
  }
  async remove(id: number): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
