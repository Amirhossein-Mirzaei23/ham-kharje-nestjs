import { Controller, Get, Post, Body, Param, Put, Delete, Query, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(): Promise<{count:number,data:User[]}> {
    let data:Array<User>
    let count 
    return this.usersService.findAll().then((res)=>{
      data = res
      count = data?.length
      return { count,data}
    }).catch((err)=>{
      return err as any
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOne(+id);
  }

  @Post('/find')
  find(@Body() payload: {phone:string}): Promise<{data:User,message:string} | null> {   
    let userData
    return this.usersService.findOneByPhone(payload.phone).then(res=>{
      userData = res
      if (!userData) {
           throw new BadRequestException( `کاربر مورد نظر یافت نشد`);
       } 
        return {data:userData,message:'کاربر با موفقیت یافت شد.'}
     }).catch((err)=>{
      throw new BadRequestException(err);
     })
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User | null> {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(+id);
  }
}