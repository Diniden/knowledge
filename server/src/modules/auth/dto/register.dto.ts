import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-z0-9_-]+$/i, { message: 'Username can only contain letters, numbers, hyphens, and underscores' })
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  displayName!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
