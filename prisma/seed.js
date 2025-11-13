"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, bcryptjs_1.default.hash(password, 10)];
        });
    });
}
/**
 * Check MongoDB Atlas database connection
 */
function checkMongoConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var userCount, categoryCount, companyCount, itemCount, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    console.log('🔌 Checking MongoDB Atlas connection...');
                    // Test connection
                    return [4 /*yield*/, prisma.$connect()];
                case 1:
                    // Test connection
                    _a.sent();
                    console.log('✅ Successfully connected to MongoDB Atlas\n');
                    return [4 /*yield*/, prisma.user.count()];
                case 2:
                    userCount = _a.sent();
                    return [4 /*yield*/, prisma.itemCategory.count()];
                case 3:
                    categoryCount = _a.sent();
                    return [4 /*yield*/, prisma.company.count()];
                case 4:
                    companyCount = _a.sent();
                    return [4 /*yield*/, prisma.item.count()];
                case 5:
                    itemCount = _a.sent();
                    console.log('📊 Current Database Stats:');
                    console.log("   Users: ".concat(userCount));
                    console.log("   Categories: ".concat(categoryCount));
                    console.log("   Companies: ".concat(companyCount));
                    console.log("   Items: ".concat(itemCount, "\n"));
                    return [2 /*return*/, true];
                case 6:
                    error_1 = _a.sent();
                    console.error('❌ Failed to connect to MongoDB Atlas:');
                    console.error(error_1);
                    console.error('\n💡 Troubleshooting tips:');
                    console.error('   1. Check your DATABASE_URL in .env.local file');
                    console.error('   2. Verify your MongoDB Atlas cluster is running');
                    console.error('   3. Ensure your IP is whitelisted in MongoDB Atlas');
                    console.error('   4. Check your connection string format: mongodb+srv://user:password@cluster.mongodb.net/database\n');
                    return [2 /*return*/, false];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * 🌱 Seed Database
 */
function seedDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var isConnected, adminEmail, adminPassword, existingAdmin, hashedPassword, hashedPassword, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 SellFast Database Seeder\n');
                    console.log('='.repeat(50) + '\n');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 10, 11, 13]);
                    return [4 /*yield*/, checkMongoConnection()];
                case 2:
                    isConnected = _a.sent();
                    if (!isConnected) {
                        console.error('❌ Cannot proceed without database connection. Exiting...');
                        process.exit(1);
                    }
                    console.log('='.repeat(50));
                    console.log('Starting seed process...\n');
                    /* -------------------------------------------------------------------------- */
                    /* 🧩 1. Create Admin User                                                   */
                    /* -------------------------------------------------------------------------- */
                    console.log('👤 Creating admin user...');
                    adminEmail = 'admin@sellfast.com';
                    adminPassword = 'admin123@';
                    return [4 /*yield*/, prisma.user.findUnique({
                            where: { email: adminEmail },
                        })];
                case 3:
                    existingAdmin = _a.sent();
                    if (!!existingAdmin) return [3 /*break*/, 6];
                    return [4 /*yield*/, hashPassword(adminPassword)];
                case 4:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: adminEmail,
                                password: hashedPassword,
                                name: 'Admin',
                                role: 'ADMIN',
                                isActive: true,
                                provider: 'credentials',
                                emailVerified: true,
                                phoneVerified: false,
                            },
                        })];
                case 5:
                    _a.sent();
                    console.log("\u2705 Admin user created: ".concat(adminEmail, " / ").concat(adminPassword));
                    return [3 /*break*/, 9];
                case 6: return [4 /*yield*/, hashPassword(adminPassword)];
                case 7:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.update({
                            where: { email: adminEmail },
                            data: {
                                password: hashedPassword,
                                role: 'ADMIN',
                                isActive: true,
                                emailVerified: true,
                            },
                        })];
                case 8:
                    _a.sent();
                    console.log("\u2705 Admin user updated: ".concat(adminEmail, " / ").concat(adminPassword));
                    _a.label = 9;
                case 9:
                    console.log('\n🎉 Seeding completed successfully!\n');
                    return [3 /*break*/, 13];
                case 10:
                    error_2 = _a.sent();
                    console.error('\n❌ Seeding failed:', error_2);
                    process.exit(1);
                    return [3 /*break*/, 13];
                case 11:
                    console.log('🔌 Disconnecting from database...');
                    return [4 /*yield*/, prisma.$disconnect()];
                case 12:
                    _a.sent();
                    console.log('✅ Disconnected successfully\n');
                    return [7 /*endfinally*/];
                case 13: return [2 /*return*/];
            }
        });
    });
}
// Run the seeder directly
seedDatabase();
