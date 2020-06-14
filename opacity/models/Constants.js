class Constants {
  static FILENAME_MAX_LENGTH = 256;
  static CURRENT_VERSION = 1;
  static IV_BYTE_LENGTH = 16;
  static TAG_BYTE_LENGTH = 16;
  static TAG_BIT_LENGTH = this.TAG_BYTE_LENGTH * 8;
  static DEFAULT_BLOCK_SIZE = 64 * 1024;
  static BLOCK_OVERHEAD = this.TAG_BYTE_LENGTH + this.IV_BYTE_LENGTH;
  static DEFAULT_PART_SIZE =
    128 * (this.DEFAULT_BLOCK_SIZE + this.BLOCK_OVERHEAD);
}

module.exports = Constants;
