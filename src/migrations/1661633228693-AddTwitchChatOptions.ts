import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTwitchChatOptions1661633228693 implements MigrationInterface {
    name = 'AddTwitchChatOptions1661633228693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tc_options" ("clientId" character varying NOT NULL, "tokenData" jsonb NOT NULL, CONSTRAINT "PK_e6705fa151f3a738bc153f141e6" PRIMARY KEY ("clientId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "tc_options"`);
    }

}
