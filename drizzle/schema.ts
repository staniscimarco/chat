import { pgTable, unique, pgEnum, text, boolean, timestamp, foreignKey, uuid } from "drizzle-orm/pg-core"

import { sql } from "drizzle-orm"
export const userSystemEnum = pgEnum("user_system_enum", ['user', 'system'])


export const users = pgTable("users", {
	id: text("id").primaryKey().notNull(),
	username: text("username").notNull(),
	email: text("email").notNull(),
	passwordHash: text("password_hash").notNull(),
	isAdmin: boolean("is_admin").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		usersUsernameUnique: unique("users_username_unique").on(table.username),
	}
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	token: text("token").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		sessionsTokenUnique: unique("sessions_token_unique").on(table.token),
	}
});

export const chats = pgTable("chats", {
	id: text("id").default(nextval('chats_id_seq'::regclass)).primaryKey().notNull(),
	pdfName: text("pdf_name").notNull(),
	pdfUrl: text("pdf_url").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	userId: text("user_id").notNull(),
	fileKey: text("file_key").notNull(),
});

export const messages = pgTable("messages", {
	id: text("id").default(nextval('messages_id_seq'::regclass)).primaryKey().notNull(),
	chatId: text("chat_id").notNull().references(() => chats.id, { onDelete: "cascade" } ),
	content: text("content").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	role: text("role").notNull(),
});

export const topicMessages = pgTable("topic_messages", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	topicId: uuid("topic_id"),
	role: text("role").notNull(),
	content: text("content").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const topics = pgTable("topics", {
	id: uuid("id").defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	title: text("title").notNull(),
	description: text("description").notNull(),
	content: text("content").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});