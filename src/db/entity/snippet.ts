
import { BaseEntity, Column, Entity, PrimaryColumn, PrimaryGeneratedColumn, } from "typeorm";

@Entity("snippet")
export class Snippet extends BaseEntity {
    @PrimaryGeneratedColumn({})
    id: number
    @Column({ type: 'text' })
    data: string
}
