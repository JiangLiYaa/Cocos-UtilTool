// @ts-ignore encryptjs 为 UMD，Cocos 按 default 导入
import encrypt from './encryptjs.js';

/**
 * JSON + AES 加解密（走 encryptjs，默认 256 位）。
 * 存档请在项目里自己定 key，不要把玩法字段写进本工具。
 */
export class CryptoUtil {
    /**
     * 把任意数据 JSON 序列化后加密。
     * @param data 对象 / 数组 / 基本类型
     * @param key 密钥口令
     * @param nBits 128 / 192 / 256，默认 256
     * @returns Base64 密文
     */
    static encryptData(data: unknown, key: string, nBits: 128 | 192 | 256 = 256): string {
        const dataString = JSON.stringify(data);
        return encrypt.encrypt(dataString, key, nBits);
    }

    /**
     * 解密密文并尝试 JSON.parse。
     * @param cipherText Base64 密文
     * @param key 密钥口令
     * @param nBits 128 / 192 / 256，默认 256
     * @returns 解析后的对象；解析失败则返回原始字符串
     */
    static decryptData(cipherText: string, key: string, nBits: 128 | 192 | 256 = 256): unknown {
        const bytes = encrypt.decrypt(cipherText, key, nBits);
        try {
            return JSON.parse(bytes);
        } catch {
            return bytes;
        }
    }
}
