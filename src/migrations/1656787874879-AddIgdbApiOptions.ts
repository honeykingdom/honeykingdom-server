import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIgdbApiOptions1656787874879 implements MigrationInterface {
    name = 'AddIgdbApiOptions1656787874879'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "igdb_api_options" ("id" integer NOT NULL, "accessToken" character varying NOT NULL, "expiresIn" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c8a4fb709d0fca471942735e8bd" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "igdb_api_options"`);
    }

}
