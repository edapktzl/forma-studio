from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)

class CurrentAdmin(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
